/**
 * JWT REST DML/SELECT on audit_log is disabled (PBI-029 AE).
 * Mutations must call `appendAuditLog` → audit-service `op: "append"` (admin writer).
 * Admin browse/verify/export stay on `invokeAuditService` (DT-ENT-01 gated).
 */
export function createAuditLogRepository(): never {
  throw new Error("JWT audit_log repository is disabled; use appendAuditLog");
}
