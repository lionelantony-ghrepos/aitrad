import type { RuleAuditView } from "@meridian/schemas";

export type ExplainRow = {
  tableKey: string;
  rowId: string;
  reason: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function tableKeyOf(matched: Record<string, unknown>): string {
  const fromId = typeof matched.id === "string" ? matched.id : "";
  const fromKey = typeof matched.row_key === "string" ? matched.row_key : "";
  const outputs = asRecord(matched.outputs);
  const reasonCode = outputs && typeof outputs.reason_code === "string" ? outputs.reason_code : "";
  if (fromId.startsWith("DT-")) {
    return fromId.split(":")[0] ?? fromId;
  }
  if (reasonCode.startsWith("DT-")) {
    return reasonCode;
  }
  void fromKey;
  return "";
}

export function explainRowsFromAudit(audit: RuleAuditView): ExplainRow[] {
  const matched = audit.matched_rows;
  const list = Array.isArray(matched) ? matched : [];
  const rows: ExplainRow[] = [];
  for (const item of list) {
    const rec = asRecord(item);
    if (!rec) {
      continue;
    }
    const outputs = asRecord(rec.outputs);
    const reason =
      (outputs && typeof outputs.reason === "string" && outputs.reason) ||
      (outputs && typeof outputs.reason_code === "string" && outputs.reason_code) ||
      (typeof rec.id === "string" ? rec.id : "matched");
    const id = typeof rec.id === "string" ? rec.id : "";
    rows.push({
      tableKey: tableKeyOf(rec),
      rowId: id,
      reason,
    });
  }
  if (rows.length === 0) {
    const outcome = asRecord(audit.outcome);
    const reason =
      (outcome && typeof outcome.reason === "string" && outcome.reason) ||
      (outcome && typeof outcome.reason_code === "string" && outcome.reason_code) ||
      audit.domain;
    rows.push({ tableKey: "", rowId: audit.id, reason });
  }
  return rows;
}
