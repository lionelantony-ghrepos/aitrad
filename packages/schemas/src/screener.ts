import { z } from "zod";
import { conditionOperatorSchema, type ConditionOperator } from "./decision-table";
import { marketCapBandSchema } from "./entities";
import { numericSchema, timestamptzSchema, uuidSchema } from "./primitives";

/** Engineering result cap (DoS guard), not a decision-table threshold. */
export const SCREENER_RESULT_LIMIT = 500;

export const screenerCombinatorSchema = z.enum(["and", "or"]);

export type ScreenerCombinator = z.infer<typeof screenerCombinatorSchema>;

export const screenerFieldIdSchema = z.enum([
  "sector",
  "market_cap_band",
  "pe",
  "dividend_yield",
  "pct_chg",
  "volume",
  "rsi_14",
  "week52_proximity",
]);

export type ScreenerFieldId = z.infer<typeof screenerFieldIdSchema>;

export const screenerSortColumnSchema = z.enum([
  "symbol",
  "name",
  "sector",
  "market_cap_band",
  "pe",
  "dividend_yield",
  "pct_chg",
  "volume",
  "rsi_14",
  "week52_proximity",
  "last",
]);

export type ScreenerSortColumn = z.infer<typeof screenerSortColumnSchema>;

export const screenerSortDirSchema = z.enum(["asc", "desc"]);

export type ScreenerSortDir = z.infer<typeof screenerSortDirSchema>;

const STRING_OPS = ["eq", "neq", "in", "not_in", "regex", "is_null", "any"] as const;
const NUMBER_OPS = ["eq", "neq", "lt", "lte", "gt", "gte", "between", "is_null", "any"] as const;
const ENUM_OPS = ["eq", "neq", "in", "not_in", "is_null", "any"] as const;

export type ScreenerFieldType = "string" | "number" | "enum";

export type ScreenerFieldDef = {
  id: ScreenerFieldId;
  label: string;
  type: ScreenerFieldType;
  operators: readonly ConditionOperator[];
  sqlExpr: string;
};

/**
 * Column expressions are a closed whitelist. User input never becomes an identifier.
 * JSON paths reuse PBI-020 `fundamentals.metrics` groups.
 */
export const SCREENER_FIELD_REGISTRY: Record<ScreenerFieldId, ScreenerFieldDef> = {
  sector: {
    id: "sector",
    label: "Sector",
    type: "string",
    operators: STRING_OPS,
    sqlExpr: "i.sector",
  },
  market_cap_band: {
    id: "market_cap_band",
    label: "Market cap band",
    type: "enum",
    operators: ENUM_OPS,
    sqlExpr: "i.market_cap_band",
  },
  pe: {
    id: "pe",
    label: "P/E",
    type: "number",
    operators: NUMBER_OPS,
    sqlExpr: "(f.metrics->'valuation'->>'pe')::numeric",
  },
  dividend_yield: {
    id: "dividend_yield",
    label: "Div yield",
    type: "number",
    operators: NUMBER_OPS,
    sqlExpr: "(f.metrics->'dividends'->>'dividend_yield')::numeric",
  },
  pct_chg: {
    id: "pct_chg",
    label: "% chg today",
    type: "number",
    operators: NUMBER_OPS,
    sqlExpr:
      "CASE WHEN q.prev_close IS NULL OR q.prev_close = 0 THEN NULL ELSE (q.last - q.prev_close) / q.prev_close * 100 END",
  },
  volume: {
    id: "volume",
    label: "Volume",
    type: "number",
    operators: NUMBER_OPS,
    sqlExpr: "q.volume",
  },
  rsi_14: {
    id: "rsi_14",
    label: "RSI(14)",
    type: "number",
    operators: NUMBER_OPS,
    sqlExpr: "r.rsi_14",
  },
  week52_proximity: {
    id: "week52_proximity",
    label: "52w proximity",
    type: "number",
    operators: NUMBER_OPS,
    sqlExpr:
      "CASE WHEN NULLIF((f.metrics->'ranges'->>'week52_high')::numeric - (f.metrics->'ranges'->>'week52_low')::numeric, 0) IS NULL THEN NULL ELSE (q.last - (f.metrics->'ranges'->>'week52_low')::numeric) / ((f.metrics->'ranges'->>'week52_high')::numeric - (f.metrics->'ranges'->>'week52_low')::numeric) END",
  },
};

const SORT_SQL: Record<ScreenerSortColumn, string> = {
  symbol: "i.symbol",
  name: "i.name",
  sector: "i.sector",
  market_cap_band: "i.market_cap_band",
  pe: "(f.metrics->'valuation'->>'pe')::numeric",
  dividend_yield: "(f.metrics->'dividends'->>'dividend_yield')::numeric",
  pct_chg:
    "CASE WHEN q.prev_close IS NULL OR q.prev_close = 0 THEN NULL ELSE (q.last - q.prev_close) / q.prev_close * 100 END",
  volume: "q.volume",
  rsi_14: "r.rsi_14",
  week52_proximity:
    "CASE WHEN NULLIF((f.metrics->'ranges'->>'week52_high')::numeric - (f.metrics->'ranges'->>'week52_low')::numeric, 0) IS NULL THEN NULL ELSE (q.last - (f.metrics->'ranges'->>'week52_low')::numeric) / ((f.metrics->'ranges'->>'week52_high')::numeric - (f.metrics->'ranges'->>'week52_low')::numeric) END",
  last: "q.last",
};

const screenerValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string(), z.number()])),
  z.null(),
]);

export const screenerConditionSchema = z
  .object({
    field: screenerFieldIdSchema,
    op: conditionOperatorSchema,
    value: screenerValueSchema.optional(),
  })
  .superRefine((condition, ctx) => {
    const def = SCREENER_FIELD_REGISTRY[condition.field];
    if (!def.operators.includes(condition.op)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "OPERATOR_NOT_ALLOWED",
        path: ["op"],
      });
    }
    if (condition.op === "is_null" || condition.op === "any") {
      return;
    }
    if (condition.value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "VALUE_REQUIRED",
        path: ["value"],
      });
      return;
    }
    if (condition.op === "in" || condition.op === "not_in") {
      if (!Array.isArray(condition.value) || condition.value.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "VALUE_LIST_REQUIRED",
          path: ["value"],
        });
      }
      return;
    }
    if (condition.op === "between") {
      if (!Array.isArray(condition.value) || condition.value.length !== 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "BETWEEN_PAIR_REQUIRED",
          path: ["value"],
        });
      }
      return;
    }
    if (condition.field === "market_cap_band" && typeof condition.value === "string") {
      if (!marketCapBandSchema.safeParse(condition.value).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "MARKET_CAP_BAND_INVALID",
          path: ["value"],
        });
      }
    }
  });

export type ScreenerCondition = z.infer<typeof screenerConditionSchema>;

export const screenerGroupSchema = z.object({
  combinator: screenerCombinatorSchema,
  conditions: z.array(screenerConditionSchema).min(1).max(16),
});

export type ScreenerGroup = z.infer<typeof screenerGroupSchema>;

export const screenerCriteriaSchema = z.object({
  combinator: screenerCombinatorSchema,
  groups: z.array(screenerGroupSchema).min(1).max(16),
});

export type ScreenerCriteria = z.infer<typeof screenerCriteriaSchema>;

export const screenerSortSchema = z.object({
  column: screenerSortColumnSchema,
  dir: screenerSortDirSchema,
});

export type ScreenerSort = z.infer<typeof screenerSortSchema>;

export const defaultScreenerSort: ScreenerSort = { column: "symbol", dir: "asc" };

export const screenerRunRequestSchema = z
  .object({
    op: z.enum(["run", "count"]).optional(),
    criteria: screenerCriteriaSchema,
    sort: screenerSortSchema.optional(),
  })
  .strict();

export type ScreenerRunRequest = z.infer<typeof screenerRunRequestSchema>;

export const screenerRowSchema = z.object({
  instrument_id: uuidSchema,
  symbol: z.string().min(1),
  name: z.string().min(1),
  sector: z.string().nullable(),
  market_cap_band: z.string().nullable(),
  pe: numericSchema.nullable(),
  dividend_yield: numericSchema.nullable(),
  pct_chg: numericSchema.nullable(),
  volume: numericSchema.nullable(),
  last: numericSchema.nullable(),
  rsi_14: numericSchema.nullable(),
  week52_proximity: numericSchema.nullable(),
});

export type ScreenerRow = z.infer<typeof screenerRowSchema>;

export const screenerRunResponseSchema = z.object({
  rows: z.array(screenerRowSchema),
  count: z.number().int().nonnegative(),
  truncated: z.boolean(),
});

export type ScreenerRunResponse = z.infer<typeof screenerRunResponseSchema>;

export const screenerCountResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  truncated: z.boolean(),
});

export type ScreenerCountResponse = z.infer<typeof screenerCountResponseSchema>;

export const screenRecordSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  name: z.string().min(1),
  criteria: screenerCriteriaSchema,
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});

export type ScreenRecord = z.infer<typeof screenRecordSchema>;

export const screenInsertSchema = z.object({
  user_id: uuidSchema,
  name: z.string().min(1).max(80),
  criteria: screenerCriteriaSchema,
});

export type ScreenInsert = z.infer<typeof screenInsertSchema>;

export const screenPatchSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    criteria: screenerCriteriaSchema.optional(),
  })
  .strict();

export type ScreenPatch = z.infer<typeof screenPatchSchema>;

export const instrumentDailyRsiSchema = z.object({
  instrument_id: uuidSchema,
  rsi_14: numericSchema.nullable(),
  as_of_date: z.string().min(10),
  updated_at: timestamptzSchema,
});

export type InstrumentDailyRsi = z.infer<typeof instrumentDailyRsiSchema>;

const SELECT_LIST = `SELECT i.id AS instrument_id, i.symbol AS symbol, i.name AS name, i.sector AS sector, i.market_cap_band AS market_cap_band, (f.metrics->'valuation'->>'pe')::numeric AS pe, (f.metrics->'dividends'->>'dividend_yield')::numeric AS dividend_yield, CASE WHEN q.prev_close IS NULL OR q.prev_close = 0 THEN NULL ELSE (q.last - q.prev_close) / q.prev_close * 100 END AS pct_chg, q.volume AS volume, q.last AS last, r.rsi_14 AS rsi_14, CASE WHEN NULLIF((f.metrics->'ranges'->>'week52_high')::numeric - (f.metrics->'ranges'->>'week52_low')::numeric, 0) IS NULL THEN NULL ELSE (q.last - (f.metrics->'ranges'->>'week52_low')::numeric) / ((f.metrics->'ranges'->>'week52_high')::numeric - (f.metrics->'ranges'->>'week52_low')::numeric) END AS week52_proximity`;

const FROM_JOIN = `FROM public.instruments i LEFT JOIN public.fundamentals f ON f.instrument_id = i.id LEFT JOIN public.quotes_latest q ON q.instrument_id = i.id LEFT JOIN public.instrument_daily_rsi r ON r.instrument_id = i.id`;

export type CompiledScreenerSql = {
  sql: string;
  params: unknown[];
  paramsJson: unknown[];
};

function sqlCombinator(value: ScreenerCombinator): "AND" | "OR" {
  return value === "or" ? "OR" : "AND";
}

function bind(params: unknown[], value: unknown, cast: "text" | "numeric"): string {
  const index = params.length;
  params.push(value);
  if (cast === "numeric") {
    return `($1->>${index})::numeric`;
  }
  return `($1->>${index})`;
}

function valueCast(field: ScreenerFieldDef): "text" | "numeric" {
  return field.type === "number" ? "numeric" : "text";
}

function compileCondition(condition: ScreenerCondition, params: unknown[]): string {
  const field = SCREENER_FIELD_REGISTRY[condition.field];
  const expr = field.sqlExpr;
  const op = condition.op;
  if (op === "any") {
    return "TRUE";
  }
  if (op === "is_null") {
    return `(${expr}) IS NULL`;
  }
  const cast = valueCast(field);
  if (op === "in" || op === "not_in") {
    const list = condition.value;
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error("VALUE_LIST_REQUIRED");
    }
    const parts = list.map((item) => bind(params, item, cast));
    const inn = `(${expr}) IN (${parts.join(", ")})`;
    return op === "not_in" ? `(NOT ${inn})` : inn;
  }
  if (op === "between") {
    const pair = condition.value;
    if (!Array.isArray(pair) || pair.length !== 2) {
      throw new Error("BETWEEN_PAIR_REQUIRED");
    }
    const lo = bind(params, pair[0], "numeric");
    const hi = bind(params, pair[1], "numeric");
    return `(${expr}) BETWEEN ${lo} AND ${hi}`;
  }
  if (op === "regex") {
    return `(${expr}) ~ ${bind(params, condition.value, "text")}`;
  }
  const rhs = bind(params, condition.value, cast);
  if (op === "eq") {
    return `(${expr}) = ${rhs}`;
  }
  if (op === "neq") {
    return `(${expr}) IS DISTINCT FROM ${rhs}`;
  }
  if (op === "lt") {
    return `(${expr}) < ${rhs}`;
  }
  if (op === "lte") {
    return `(${expr}) <= ${rhs}`;
  }
  if (op === "gt") {
    return `(${expr}) > ${rhs}`;
  }
  if (op === "gte") {
    return `(${expr}) >= ${rhs}`;
  }
  throw new Error("OPERATOR_NOT_ALLOWED");
}

function compileWhere(criteria: ScreenerCriteria, params: unknown[]): string {
  const groupSql = criteria.groups.map((group) => {
    const parts = group.conditions.map((condition) => compileCondition(condition, params));
    return `(${parts.join(` ${sqlCombinator(group.combinator)} `)})`;
  });
  return groupSql.join(` ${sqlCombinator(criteria.combinator)} `);
}

const FORBIDDEN_SQL =
  /\b(drop|insert|update|delete|alter|truncate|create|grant|revoke|copy|execute|into|union|pg_sleep|set|reset)\b/i;

export function assertSafeScreenerSql(sql: string): void {
  if (!sql.startsWith("SELECT ")) {
    throw new Error("SCREENER_SQL_REJECTED");
  }
  if (sql.includes(";")) {
    throw new Error("SCREENER_SQL_REJECTED");
  }
  if (FORBIDDEN_SQL.test(sql)) {
    throw new Error("SCREENER_SQL_REJECTED");
  }
  if (!sql.includes("FROM public.instruments i")) {
    throw new Error("SCREENER_SQL_REJECTED");
  }
}

export function compileScreenerSql(input: {
  criteria: ScreenerCriteria;
  sort?: ScreenerSort;
  mode?: "run" | "count";
}): CompiledScreenerSql {
  const criteria = screenerCriteriaSchema.parse(input.criteria);
  const sort = screenerSortSchema.parse(input.sort ?? defaultScreenerSort);
  const params: unknown[] = [];
  const where = compileWhere(criteria, params);
  const orderExpr = SORT_SQL[sort.column];
  const dir = sort.dir === "desc" ? "DESC" : "ASC";
  const mode = input.mode ?? "run";
  const sql =
    mode === "count"
      ? `SELECT COUNT(*)::int AS match_count ${FROM_JOIN} WHERE ${where}`
      : `${SELECT_LIST} ${FROM_JOIN} WHERE ${where} ORDER BY ${orderExpr} ${dir} NULLS LAST, i.symbol ASC LIMIT ${SCREENER_RESULT_LIMIT}`;
  assertSafeScreenerSql(sql);
  return { sql, params, paramsJson: params };
}

export type ScreenerFact = {
  instrument_id: string;
  symbol: string;
  name: string;
  sector: string | null;
  market_cap_band: string | null;
  pe: number | null;
  dividend_yield: number | null;
  last: number | null;
  prev_close: number | null;
  volume: number | null;
  rsi_14: number | null;
  week52_low: number | null;
  week52_high: number | null;
};

export function pctChgToday(last: number | null, prevClose: number | null): number | null {
  if (last == null || prevClose == null || prevClose === 0) {
    return null;
  }
  return ((last - prevClose) / prevClose) * 100;
}

export function week52Proximity(
  last: number | null,
  low: number | null,
  high: number | null,
): number | null {
  if (last == null || low == null || high == null) {
    return null;
  }
  const span = high - low;
  if (span === 0) {
    return null;
  }
  return (last - low) / span;
}

export function toScreenerRow(fact: ScreenerFact): ScreenerRow {
  return screenerRowSchema.parse({
    instrument_id: fact.instrument_id,
    symbol: fact.symbol,
    name: fact.name,
    sector: fact.sector,
    market_cap_band: fact.market_cap_band,
    pe: fact.pe,
    dividend_yield: fact.dividend_yield,
    pct_chg: pctChgToday(fact.last, fact.prev_close),
    volume: fact.volume,
    last: fact.last,
    rsi_14: fact.rsi_14,
    week52_proximity: week52Proximity(fact.last, fact.week52_low, fact.week52_high),
  });
}

function factValue(fact: ScreenerFact, field: ScreenerFieldId): unknown {
  switch (field) {
    case "sector":
      return fact.sector;
    case "market_cap_band":
      return fact.market_cap_band;
    case "pe":
      return fact.pe;
    case "dividend_yield":
      return fact.dividend_yield;
    case "pct_chg":
      return pctChgToday(fact.last, fact.prev_close);
    case "volume":
      return fact.volume;
    case "rsi_14":
      return fact.rsi_14;
    case "week52_proximity":
      return week52Proximity(fact.last, fact.week52_low, fact.week52_high);
  }
}

function compareOrd(left: unknown, right: unknown): number | null {
  if (typeof left === "number" && typeof right === "number") {
    if (!Number.isFinite(left) || !Number.isFinite(right)) {
      return null;
    }
    if (left === right) {
      return 0;
    }
    return left < right ? -1 : 1;
  }
  if (typeof left === "string" && typeof right === "string") {
    if (left === right) {
      return 0;
    }
    return left < right ? -1 : 1;
  }
  return null;
}

function matchOp(op: ConditionOperator, left: unknown, right: unknown): boolean {
  switch (op) {
    case "any":
      return true;
    case "is_null":
      return left === null || left === undefined;
    case "eq":
      return Object.is(left, right);
    case "neq":
      return !Object.is(left, right);
    case "lt": {
      const ord = compareOrd(left, right);
      return ord !== null && ord < 0;
    }
    case "lte": {
      const ord = compareOrd(left, right);
      return ord !== null && ord <= 0;
    }
    case "gt": {
      const ord = compareOrd(left, right);
      return ord !== null && ord > 0;
    }
    case "gte": {
      const ord = compareOrd(left, right);
      return ord !== null && ord >= 0;
    }
    case "in":
      return Array.isArray(right) && right.some((item) => Object.is(left, item));
    case "not_in":
      return Array.isArray(right) && !right.some((item) => Object.is(left, item));
    case "between": {
      if (!Array.isArray(right) || right.length !== 2) {
        return false;
      }
      const lo = compareOrd(left, right[0]);
      const hi = compareOrd(left, right[1]);
      return lo !== null && hi !== null && lo >= 0 && hi <= 0;
    }
    case "regex": {
      if (typeof right !== "string" || left == null) {
        return false;
      }
      try {
        return new RegExp(right).test(String(left));
      } catch {
        return false;
      }
    }
  }
}

function matchCondition(fact: ScreenerFact, condition: ScreenerCondition): boolean {
  return matchOp(condition.op, factValue(fact, condition.field), condition.value);
}

function matchGroup(fact: ScreenerFact, group: ScreenerGroup): boolean {
  if (group.combinator === "or") {
    return group.conditions.some((condition) => matchCondition(fact, condition));
  }
  return group.conditions.every((condition) => matchCondition(fact, condition));
}

export function matchScreenerCriteria(fact: ScreenerFact, criteria: ScreenerCriteria): boolean {
  const parsed = screenerCriteriaSchema.parse(criteria);
  if (parsed.combinator === "or") {
    return parsed.groups.some((group) => matchGroup(fact, group));
  }
  return parsed.groups.every((group) => matchGroup(fact, group));
}

function sortRows(rows: ScreenerRow[], sort: ScreenerSort): ScreenerRow[] {
  const dir = sort.dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[sort.column];
    const bv = b[sort.column];
    if (av == null && bv == null) {
      return a.symbol.localeCompare(b.symbol);
    }
    if (av == null) {
      return 1;
    }
    if (bv == null) {
      return -1;
    }
    if (typeof av === "number" && typeof bv === "number") {
      if (av === bv) {
        return a.symbol.localeCompare(b.symbol);
      }
      return av < bv ? -1 * dir : 1 * dir;
    }
    const cmp = String(av).localeCompare(String(bv));
    if (cmp === 0) {
      return a.symbol.localeCompare(b.symbol);
    }
    return cmp * dir;
  });
}

export function evaluateScreener(
  facts: readonly ScreenerFact[],
  request: ScreenerRunRequest,
): ScreenerRunResponse {
  const parsed = screenerRunRequestSchema.parse(request);
  const sort = parsed.sort ?? defaultScreenerSort;
  const matched = facts
    .filter((fact) => matchScreenerCriteria(fact, parsed.criteria))
    .map(toScreenerRow);
  const sorted = sortRows(matched, sort);
  const truncated = sorted.length > SCREENER_RESULT_LIMIT;
  return screenerRunResponseSchema.parse({
    rows: sorted.slice(0, SCREENER_RESULT_LIMIT),
    count: matched.length,
    truncated,
  });
}

export function screenerCsvRows(rows: readonly ScreenerRow[]): string[][] {
  const header = [
    "symbol",
    "name",
    "sector",
    "market_cap_band",
    "pe",
    "dividend_yield",
    "pct_chg",
    "volume",
    "last",
    "rsi_14",
    "week52_proximity",
  ];
  const body = rows.map((row) => [
    row.symbol,
    row.name,
    row.sector ?? "",
    row.market_cap_band ?? "",
    row.pe == null ? "" : String(row.pe),
    row.dividend_yield == null ? "" : String(row.dividend_yield),
    row.pct_chg == null ? "" : String(row.pct_chg),
    row.volume == null ? "" : String(row.volume),
    row.last == null ? "" : String(row.last),
    row.rsi_14 == null ? "" : String(row.rsi_14),
    row.week52_proximity == null ? "" : String(row.week52_proximity),
  ]);
  return [header, ...body];
}
