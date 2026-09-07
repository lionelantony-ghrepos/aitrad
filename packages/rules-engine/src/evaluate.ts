import {
  decisionTableSchema,
  type ConditionOperator,
  type DecisionCondition,
  type DecisionRow,
  type DecisionTable,
  type HitPolicy,
} from "@meridian/schemas";

export type { ConditionOperator, DecisionCondition, DecisionRow, DecisionTable, HitPolicy };
export { decisionTableSchema };

export type EvaluationContext = Record<string, unknown>;

export type TraceCell = {
  input: string;
  op: ConditionOperator;
  passed: boolean;
};

export type TraceEntry = {
  rowId: string;
  priority: number;
  effective: boolean;
  cells: TraceCell[];
  matched: boolean;
  outputs: Record<string, unknown>;
};

export type EvaluationResult = {
  outcome: Record<string, unknown> | Array<Record<string, unknown>>;
  matchedRows: DecisionRow[];
  trace: TraceEntry[];
};

export type CompiledTable = {
  table: DecisionTable;
  evaluate: (context: EvaluationContext, clock: Date) => EvaluationResult;
};

export function compile(table: unknown): CompiledTable {
  const parsed = decisionTableSchema.parse(table);
  return {
    table: parsed,
    evaluate(context: EvaluationContext, clock: Date) {
      return evaluateParsed(parsed, context, clock);
    },
  };
}

export function evaluate(
  table: unknown,
  context: EvaluationContext,
  clock: Date,
): EvaluationResult {
  const parsed = decisionTableSchema.parse(table);
  return evaluateParsed(parsed, context, clock);
}

function evaluateParsed(
  table: DecisionTable,
  context: EvaluationContext,
  clock: Date,
): EvaluationResult {
  const trace: TraceEntry[] = [];
  const matched: Array<{ row: DecisionRow; outputs: Record<string, unknown> }> = [];

  for (const row of table.rows) {
    const effective = isEffective(row, clock);
    const cells = row.conditions.map((condition) => ({
      input: condition.input,
      op: condition.op,
      passed: evaluateCondition(condition, context),
    }));
    const conditionsPass = cells.every((cell) => cell.passed);
    const rowMatched = effective && conditionsPass;
    const outputs = interpolateOutputs(row.outputs, context);
    trace.push({
      rowId: row.id,
      priority: row.priority,
      effective,
      cells,
      matched: rowMatched,
      outputs,
    });
    if (rowMatched) {
      matched.push({ row, outputs });
    }
  }

  matched.sort((a, b) => a.row.priority - b.row.priority || a.row.id.localeCompare(b.row.id));
  const matchedRows = matched.map((item) => item.row);
  const defaultOutputs = interpolateOutputs(table.default_outputs, context);
  const outcome = applyHitPolicy(
    table.hit_policy,
    matched.map((item) => item.outputs),
    defaultOutputs,
  );

  return { outcome, matchedRows, trace };
}

function applyHitPolicy(
  policy: HitPolicy,
  matchedOutputs: Array<Record<string, unknown>>,
  defaultOutputs: Record<string, unknown>,
): EvaluationResult["outcome"] {
  if (matchedOutputs.length === 0) {
    return policy === "COLLECT" ? [defaultOutputs] : defaultOutputs;
  }
  if (policy === "FIRST") {
    return matchedOutputs[0] ?? defaultOutputs;
  }
  if (policy === "ALL") {
    return Object.assign({}, ...matchedOutputs) as Record<string, unknown>;
  }
  return matchedOutputs;
}

function isEffective(row: DecisionRow, clock: Date): boolean {
  const clockMs = clock.getTime();
  if (row.effective_from != null && row.effective_from !== "") {
    if (clockMs < Date.parse(row.effective_from)) {
      return false;
    }
  }
  if (row.effective_to != null && row.effective_to !== "") {
    if (clockMs >= Date.parse(row.effective_to)) {
      return false;
    }
  }
  return true;
}

function evaluateCondition(condition: DecisionCondition, context: EvaluationContext): boolean {
  const left = context[condition.input];
  const passed = matchOperator(condition.op, left, condition.value);
  return condition.negate === true ? !passed : passed;
}

function matchOperator(op: ConditionOperator, left: unknown, right: unknown): boolean {
  switch (op) {
    case "any":
      return true;
    case "is_null":
      return left === null || left === undefined;
    case "eq":
      return Object.is(left, right);
    case "neq":
      return !Object.is(left, right);
    case "lt":
      return relational(left, right, (ord) => ord < 0);
    case "lte":
      return relational(left, right, (ord) => ord <= 0);
    case "gt":
      return relational(left, right, (ord) => ord > 0);
    case "gte":
      return relational(left, right, (ord) => ord >= 0);
    case "in":
      return Array.isArray(right) && right.some((item) => Object.is(left, item));
    case "not_in":
      return Array.isArray(right) && !right.some((item) => Object.is(left, item));
    case "between":
      return inBetween(left, right);
    case "regex":
      return matchRegex(left, right);
  }
}

function relational(left: unknown, right: unknown, pred: (ord: number) => boolean): boolean {
  const ord = compareOrd(left, right);
  if (ord === null) {
    return false;
  }
  return pred(ord);
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

function inBetween(left: unknown, right: unknown): boolean {
  if (!Array.isArray(right) || right.length !== 2) {
    return false;
  }
  const lo = right[0];
  const hi = right[1];
  const geLo = relational(left, lo, (ord) => ord >= 0);
  const leHi = relational(left, hi, (ord) => ord <= 0);
  return geLo && leHi;
}

function matchRegex(left: unknown, right: unknown): boolean {
  if (typeof right !== "string") {
    return false;
  }
  try {
    return new RegExp(right).test(String(left));
  } catch {
    return false;
  }
}

function interpolateOutputs(
  outputs: Record<string, unknown>,
  context: EvaluationContext,
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(outputs)) {
    next[key] = typeof value === "string" ? interpolateMessage(value, context) : value;
  }
  return next;
}

function interpolateMessage(message: string, context: EvaluationContext): string {
  return message.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_full, field: string) => {
    const value = context[field];
    if (value === undefined || value === null) {
      return "";
    }
    return String(value);
  });
}
