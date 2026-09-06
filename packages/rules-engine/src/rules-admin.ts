import type {
  CatalogTableItem,
  DecisionCondition,
  DecisionRow,
  DecisionTable,
  SimulateResult,
  TableDiff,
} from "@meridian/schemas";
import { evaluate, type EvaluationContext } from "./evaluate";

export type CatalogGroup = {
  domain: string;
  tables: CatalogTableItem[];
};

export type ConditionCellKind = "enum" | "number" | "range" | "symbol" | "text";

const ENUM_INPUTS = new Set([
  "role",
  "side",
  "order_type",
  "tif",
  "experience_level",
  "instrument_status",
  "session",
  "tool",
  "group_type",
  "trail_type",
  "instrument_beta_class",
  "suitability_tier",
  "persona",
]);

const ENUM_VALUES: Record<string, string[]> = {
  role: ["trader", "admin", "compliance"],
  side: ["buy", "sell"],
  order_type: ["market", "limit", "stop", "stop_limit", "trailing_stop"],
  tif: ["DAY", "GTC", "IOC"],
  experience_level: ["novice", "intermediate", "advanced"],
  instrument_status: ["active", "halted", "delisted"],
  session: ["open", "closed", "pre", "post"],
  tool: ["propose_order", "create_watchlist_item", "create_alert", "create_monitor"],
  group_type: ["bracket", "oco"],
  trail_type: ["percent", "amount"],
  instrument_beta_class: ["low", "medium", "high"],
  suitability_tier: ["conservative", "standard", "full"],
  persona: ["trader", "admin", "compliance"],
};

export function groupTablesByDomain(tables: CatalogTableItem[]): CatalogGroup[] {
  const order: string[] = [];
  const byDomain = new Map<string, CatalogTableItem[]>();
  for (const row of tables) {
    const list = byDomain.get(row.domain);
    if (!list) {
      order.push(row.domain);
      byDomain.set(row.domain, [row]);
    } else {
      list.push(row);
    }
  }
  return order.map((domain) => ({
    domain,
    tables: byDomain.get(domain) ?? [],
  }));
}

function rowFingerprint(row: DecisionRow): string {
  return JSON.stringify({
    conditions: row.conditions,
    outputs: row.outputs,
    priority: row.priority,
    effective_from: row.effective_from ?? null,
    effective_to: row.effective_to ?? null,
  });
}

export function diffDecisionTables(
  published: DecisionTable | null,
  draft: DecisionTable | null,
  meta?: { tableKey?: string; publishedVersion?: number | null; draftVersion?: number | null },
): TableDiff {
  const publishedRows = published?.rows ?? [];
  const draftRows = draft?.rows ?? [];
  const publishedById = new Map(publishedRows.map((row) => [row.id, row]));
  const draftById = new Map(draftRows.map((row) => [row.id, row]));
  const addedRowIds: string[] = [];
  const removedRowIds: string[] = [];
  const changedRowIds: string[] = [];
  for (const row of draftRows) {
    const prev = publishedById.get(row.id);
    if (!prev) {
      addedRowIds.push(row.id);
    } else if (rowFingerprint(prev) !== rowFingerprint(row)) {
      changedRowIds.push(row.id);
    }
  }
  for (const row of publishedRows) {
    if (!draftById.has(row.id)) {
      removedRowIds.push(row.id);
    }
  }
  return {
    tableKey: meta?.tableKey ?? draft?.id ?? published?.id ?? "",
    publishedVersion: meta?.publishedVersion ?? null,
    draftVersion: meta?.draftVersion ?? null,
    addedRowIds,
    removedRowIds,
    changedRowIds,
  };
}

export function reorderDecisionRows<T extends { priority: number }>(
  rows: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= rows.length ||
    toIndex >= rows.length ||
    fromIndex === toIndex
  ) {
    return rows.map((row, index) => ({ ...row, priority: index + 1 }));
  }
  const next = [...rows];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) {
    return rows;
  }
  next.splice(toIndex, 0, moved);
  return next.map((row, index) => ({ ...row, priority: index + 1 }));
}

function outcomesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function simulateDraftAgainstAudits(input: {
  published: DecisionTable;
  draft: DecisionTable;
  audits: Array<{ id: string; context: EvaluationContext }>;
  clock: Date;
}): SimulateResult {
  const deltas: SimulateResult["deltas"] = [];
  let agree = 0;
  for (const audit of input.audits) {
    const published = evaluate(input.published, audit.context, input.clock);
    const draft = evaluate(input.draft, audit.context, input.clock);
    if (outcomesEqual(published.outcome, draft.outcome)) {
      agree += 1;
      continue;
    }
    deltas.push({
      auditId: audit.id,
      publishedOutcome: published.outcome,
      draftOutcome: draft.outcome,
      publishedRowIds: published.matchedRows.map((row) => row.id),
      draftRowIds: draft.matchedRows.map((row) => row.id),
    });
  }
  const sampleSize = input.audits.length;
  return {
    sampleSize,
    agreementPct: sampleSize === 0 ? 100 : Math.round((agree / sampleSize) * 100),
    deltas,
  };
}

export function inferConditionCellKind(
  input: string,
  op: DecisionCondition["op"],
): ConditionCellKind {
  if (input === "symbol" || input.endsWith("_symbol")) {
    return "symbol";
  }
  if (op === "between") {
    return "range";
  }
  if (ENUM_INPUTS.has(input)) {
    return "enum";
  }
  if (op === "lt" || op === "lte" || op === "gt" || op === "gte") {
    return "number";
  }
  return "text";
}

export function enumOptionsForInput(input: string): string[] {
  return ENUM_VALUES[input] ?? [];
}

export function filterRuleAudits<
  T extends { id: string; domain: string; outcome: unknown; context: unknown },
>(rows: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return rows;
  }
  return rows.filter((row) => {
    const hay = `${row.domain} ${row.id} ${JSON.stringify(row.outcome)} ${JSON.stringify(row.context)}`;
    return hay.toLowerCase().includes(needle);
  });
}

export function entitlementAllows(outcome: unknown): boolean {
  if (!outcome || typeof outcome !== "object") {
    return false;
  }
  return (outcome as { decision?: unknown }).decision === "allow";
}

export function requiredActionForAdminOp(op: string): string {
  if (op === "listCatalog" || op === "getTable" || op === "listHistory" || op === "listAudits") {
    return "rules:read";
  }
  if (op === "simulate") {
    return "rules:simulate";
  }
  if (op === "publish" || op === "rollback") {
    return "rules:publish";
  }
  return "rules:write";
}
