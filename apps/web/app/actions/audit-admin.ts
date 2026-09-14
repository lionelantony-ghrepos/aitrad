"use server";

import { auditAdminRequestSchema, type AuditAdminRequest } from "@meridian/schemas";
import {
  handleAuditServiceRequest,
  memoryPublishedTables,
  evaluate,
  baselineTable,
  verifyAuditChain,
} from "@meridian/rules-engine";
import { isAuthStub } from "@/lib/auth/mode";
import { loadAuthContext } from "@/lib/auth/session";
import { tryReadPublicInsforgeEnv } from "@/lib/insforge/env";
import { invokeAuditService } from "@/lib/api/audit-service";
import {
  stubGetAuditRetention,
  stubGetRole,
  stubListAudit,
  stubSetAuditRetention,
  stubAppendAudit,
  stubRulesMemory,
} from "@/lib/auth/stub-store";

export async function auditAdminAction(
  request: AuditAdminRequest,
): Promise<{ status: number; body: unknown }> {
  const parsed = auditAdminRequestSchema.parse(request);
  const ctx = await loadAuthContext();
  if (!ctx) {
    return { status: 401, body: { error: "UNAUTHENTICATED" } };
  }
  if (isAuthStub()) {
    const memory = stubRulesMemory();
    return handleAuditServiceRequest({
      method: "POST",
      body: parsed,
      userId: ctx.user.id,
      isService: false,
      ports: {
        async loadRole(id) {
          return stubGetRole(id);
        },
        async evaluateEntitlements(facts) {
          const table =
            memoryPublishedTables(memory, "entitlements")[0]?.table ?? baselineTable("DT-ENT-01");
          return evaluate(table, facts, new Date());
        },
        async listAudit(filter) {
          const rows = stubListAudit(filter);
          return { rows, total: rows.length };
        },
        async verifyChain() {
          return verifyAuditChain(stubListAudit({}));
        },
        async getRetentionDays() {
          return stubGetAuditRetention();
        },
        async setRetentionDays(days) {
          stubSetAuditRetention(days);
        },
        async applyRetention() {
          return 0;
        },
        async listAdminUserIds() {
          return [];
        },
        async loadChainStatus() {
          return verifyAuditChain(stubListAudit({}));
        },
        async saveChainStatus() {
          return;
        },
        utcDay() {
          return new Date().toISOString().slice(0, 10);
        },
        async lastCronDay() {
          return null;
        },
        async markCronDay() {
          return;
        },
        async writeAuditLog(row) {
          if (!row.user_id) {
            return;
          }
          stubAppendAudit({
            user_id: row.user_id,
            action: row.action,
            entity_type: row.entity_type,
            entity_id: row.entity_id,
            payload: row.payload,
          });
        },
      },
    });
  }
  const env = tryReadPublicInsforgeEnv();
  if (!env) {
    return { status: 500, body: { error: "INSFORGE_UNAVAILABLE" } };
  }
  return invokeAuditService({
    baseUrl: env.baseUrl,
    accessToken: ctx.accessToken,
    request: parsed,
  });
}
