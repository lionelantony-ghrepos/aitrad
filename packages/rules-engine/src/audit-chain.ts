import type { AuditChainVerifyResult, AuditLog } from "@meridian/schemas";

export const AUDIT_CHAIN_GENESIS = "";

export type AuditChainRecord = Pick<
  AuditLog,
  | "id"
  | "user_id"
  | "action"
  | "entity_type"
  | "entity_id"
  | "payload"
  | "created_at"
  | "prev_hash"
  | "row_hash"
>;

function stableJson(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function canonicalAuditRowJson(
  row: Omit<AuditChainRecord, "prev_hash" | "row_hash">,
): string {
  return stableJson({
    action: row.action,
    created_at: row.created_at,
    entity_id: row.entity_id,
    entity_type: row.entity_type,
    id: row.id,
    payload: row.payload ?? {},
    user_id: row.user_id,
  });
}

/** In-memory replica used by tests and the stub. Live hashes are SQL sha256. */
export function computeAuditRowHash(canonical: string, prevHash: string): string {
  const input = `${canonical}|${prevHash}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x811c9dc5);
  }
  const a = (h1 >>> 0).toString(16).padStart(8, "0");
  const b = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${a}${b}${a}${b}${a}${b}${a}${b}`;
}

export function appendAuditChainRow(
  previous: AuditChainRecord | null,
  row: Omit<AuditChainRecord, "prev_hash" | "row_hash">,
): AuditChainRecord {
  const prevHash = previous?.row_hash ?? AUDIT_CHAIN_GENESIS;
  const rowHash = computeAuditRowHash(canonicalAuditRowJson(row), prevHash);
  return { ...row, prev_hash: prevHash, row_hash: rowHash };
}

export function verifyAuditChain(rows: readonly AuditChainRecord[]): AuditChainVerifyResult {
  const ordered = [...rows].sort((a, b) => {
    const byTime = a.created_at.localeCompare(b.created_at);
    return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
  });
  let prev: AuditChainRecord | null = null;
  for (const row of ordered) {
    const expectedPrev = prev?.row_hash ?? AUDIT_CHAIN_GENESIS;
    const actualPrev = row.prev_hash ?? AUDIT_CHAIN_GENESIS;
    const expectedHash = computeAuditRowHash(canonicalAuditRowJson(row), expectedPrev);
    if (actualPrev !== expectedPrev || row.row_hash !== expectedHash) {
      return {
        ok: false,
        checked: ordered.length,
        broken_id: row.id,
        expected_hash: expectedHash,
        actual_hash: row.row_hash ?? null,
        reason: actualPrev !== expectedPrev ? "PREV_HASH_MISMATCH" : "ROW_HASH_MISMATCH",
      };
    }
    prev = row;
  }
  return {
    ok: true,
    checked: ordered.length,
    broken_id: null,
    expected_hash: null,
    actual_hash: null,
    reason: null,
  };
}

export function auditRowsToCsv(rows: readonly AuditLog[]): string {
  const header = [
    "created_at",
    "user_id",
    "action",
    "entity_type",
    "entity_id",
    "payload",
    "prev_hash",
    "row_hash",
  ];
  const body = rows.map((row) => [
    row.created_at,
    row.user_id ?? "",
    row.action,
    row.entity_type,
    row.entity_id ?? "",
    JSON.stringify(row.payload ?? {}),
    row.prev_hash ?? "",
    row.row_hash ?? "",
  ]);
  return [header, ...body]
    .map((line) =>
      line
        .map((cell) => {
          if (/[",\n]/.test(cell)) {
            return `"${cell.replaceAll('"', '""')}"`;
          }
          return cell;
        })
        .join(","),
    )
    .join("\n");
}
