import {
  auditAdminRequestSchema,
  auditLogSchema,
  type AuditAdminFilter,
  type AuditChainVerifyResult,
  type AuditLog,
} from "@meridian/schemas";
import { authorize, type AuthorizePorts } from "./authorize";
import { auditRowsToCsv, verifyAuditChain, type AuditChainRecord } from "./audit-chain";

export type AuditAdminPorts = AuthorizePorts & {
  listAudit: (filter: AuditAdminFilter) => Promise<{ rows: AuditLog[]; total: number }>;
  verifyChain: (from?: string, to?: string) => Promise<AuditChainVerifyResult>;
  getRetentionDays: () => Promise<number | null>;
  setRetentionDays: (days: number | null) => Promise<void>;
  applyRetention: (days: number) => Promise<number>;
  listAdminUserIds: () => Promise<string[]>;
  loadChainStatus: () => Promise<AuditChainVerifyResult>;
  saveChainStatus: (status: AuditChainVerifyResult) => Promise<void>;
  utcDay: () => string;
  lastCronDay: () => Promise<string | null>;
  markCronDay: (day: string) => Promise<void>;
  writeAuditLog: (row: {
    user_id: string | null;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    payload: Record<string, unknown>;
  }) => Promise<void>;
};

function actionForOp(op: string): string {
  if (op === "setRetention") {
    return "audit:write";
  }
  return "audit:read";
}

export async function handleAuditServiceRequest(input: {
  method: string;
  body: unknown;
  userId: string | null;
  isService: boolean;
  ports: AuditAdminPorts;
}): Promise<{ status: number; body: unknown }> {
  if (input.method !== "POST") {
    return { status: 405, body: { error: "METHOD_NOT_ALLOWED" } };
  }
  const parsed = auditAdminRequestSchema.safeParse(input.body);
  if (!parsed.success) {
    return { status: 400, body: { error: "INVALID_AUDIT_REQUEST" } };
  }
  const op = parsed.data.op;

  if (op === "cron") {
    if (!input.isService) {
      return { status: 403, body: { error: "SERVICE_KEY_REQUIRED" } };
    }
    const day = input.ports.utcDay();
    if (!parsed.data.force) {
      const last = await input.ports.lastCronDay();
      if (last === day) {
        const chain = await input.ports.loadChainStatus();
        return {
          status: 200,
          body: { verified: chain.ok, chain, purged: 0, alerted: 0, skipped: true },
        };
      }
    }
    const chain = await input.ports.verifyChain();
    await input.ports.saveChainStatus(chain);
    let alerted = 0;
    if (!chain.ok) {
      const admins = await input.ports.listAdminUserIds();
      for (const adminId of admins) {
        await input.ports.writeAuditLog({
          user_id: adminId,
          action: "audit:chain_mismatch",
          entity_type: "audit_log",
          entity_id: chain.broken_id,
          payload: {
            reason: chain.reason,
            expected_hash: chain.expected_hash,
            actual_hash: chain.actual_hash,
          },
        });
        alerted += 1;
      }
    }
    let purged = 0;
    const days = await input.ports.getRetentionDays();
    if (days != null) {
      purged = await input.ports.applyRetention(days);
    }
    await input.ports.markCronDay(day);
    await input.ports.writeAuditLog({
      user_id: null,
      action: "audit:cron",
      entity_type: "audit_log",
      payload: { verified: chain.ok, purged, alerted },
    });
    return {
      status: 200,
      body: { verified: chain.ok, chain, purged, alerted, skipped: false },
    };
  }

  if (input.isService) {
    return { status: 403, body: { error: "USER_JWT_REQUIRED" } };
  }
  if (!input.userId) {
    return { status: 401, body: { error: "UNAUTHENTICATED" } };
  }

  if (parsed.data.op === "append") {
    await input.ports.writeAuditLog({
      user_id: input.userId,
      action: parsed.data.action,
      entity_type: parsed.data.entity_type,
      entity_id: parsed.data.entity_id,
      payload: parsed.data.payload ?? {},
    });
    return { status: 200, body: { ok: true } };
  }

  const writeGate = await authorize({
    userId: input.userId,
    action: "audit:write",
    ports: input.ports,
  });
  const canWrite = writeGate.allowed;

  const gate = await authorize({
    userId: input.userId,
    action: actionForOp(op),
    ports: input.ports,
  });
  if (!gate.allowed) {
    return {
      status: gate.reason === "UNAUTHENTICATED" ? 401 : 403,
      body: { error: gate.reason ?? "FORBIDDEN" },
    };
  }

  if (op === "list") {
    const listed = await input.ports.listAudit(parsed.data);
    return {
      status: 200,
      body: { rows: listed.rows, total: listed.total, can_write: canWrite },
    };
  }

  if (op === "timeline") {
    const listed = await input.ports.listAudit({
      entity_type: parsed.data.entity_type,
      entity_id: parsed.data.entity_id,
      limit: 500,
      offset: 0,
    });
    return { status: 200, body: { rows: listed.rows } };
  }

  if (op === "verify") {
    const chain = await input.ports.verifyChain(parsed.data.from, parsed.data.to);
    return { status: 200, body: chain };
  }

  if (op === "export") {
    const listed = await input.ports.listAudit({ ...parsed.data, limit: 500, offset: 0 });
    return {
      status: 200,
      body: { csv: auditRowsToCsv(listed.rows), rows: listed.rows.length },
    };
  }

  if (op === "getConfig") {
    const [retention_days, chain] = await Promise.all([
      input.ports.getRetentionDays(),
      input.ports.loadChainStatus(),
    ]);
    return { status: 200, body: { retention_days, chain, can_write: canWrite } };
  }

  const before = await input.ports.getRetentionDays();
  await input.ports.setRetentionDays(parsed.data.days);
  await input.ports.writeAuditLog({
    user_id: input.userId,
    action: "audit:set_retention",
    entity_type: "feature_flags",
    payload: { before: { days: before }, after: { days: parsed.data.days } },
  });
  const chain = await input.ports.loadChainStatus();
  return {
    status: 200,
    body: { retention_days: parsed.data.days, chain, can_write: true },
  };
}

export function verifyListedChain(rows: readonly AuditLog[]): AuditChainVerifyResult {
  return verifyAuditChain(rows as AuditChainRecord[]);
}

export function parseAuditLogRows(rows: unknown): AuditLog[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.map((row) => auditLogSchema.parse(row));
}
