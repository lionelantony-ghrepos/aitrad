export type AuditWrite = {
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  payload?: Record<string, unknown>;
  before?: unknown;
  after?: unknown;
};

type InsertResult = { error: { message: string } | null };

type AuditDb = {
  from: (table: string) => {
    insert: (rows: unknown[]) => Promise<InsertResult> | InsertResult;
  };
};

/**
 * Shared audit_log writer for edge functions. Hashes are set by SQL on insert.
 */
export async function writeAuditLog(db: AuditDb, row: AuditWrite): Promise<void> {
  const payload: Record<string, unknown> = { ...(row.payload ?? {}) };
  if (row.before !== undefined) {
    payload.before = row.before;
  }
  if (row.after !== undefined) {
    payload.after = row.after;
  }
  const insert = await db.from("audit_log").insert([
    {
      user_id: row.user_id ?? null,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id ?? null,
      payload,
    },
  ]);
  if (insert.error) {
    throw new Error(insert.error.message);
  }
}
