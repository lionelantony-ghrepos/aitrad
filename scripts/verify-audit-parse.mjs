export function parseVerifyAuditChainRows(raw) {
  const parsed = raw;
  const row = parsed?.rows?.[0];
  if (!row) {
    throw new Error("VERIFY_AUDIT_CHAIN_EMPTY");
  }
  return {
    ok: Boolean(row.ok),
    checked: Number(row.checked ?? 0),
    reason: typeof row.reason === "string" ? row.reason : undefined,
  };
}
