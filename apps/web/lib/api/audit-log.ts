import { auditLogInsertSchema, auditLogSchema, type AuditLogInsert } from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { recordTables } from "./rest";

export function createAuditLogRepository(client: RecordsClient) {
  return {
    listMine() {
      return client.list(recordTables.audit_log, auditLogSchema);
    },
    insert(row: AuditLogInsert) {
      return client.insert(recordTables.audit_log, auditLogSchema, [
        auditLogInsertSchema.parse(row),
      ]);
    },
  };
}

export type AuditLogRepository = ReturnType<typeof createAuditLogRepository>;
