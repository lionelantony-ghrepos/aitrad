"use server";

import { adminUsersRequestSchema, type AdminUsersRequest } from "@meridian/schemas";
import {
  handleAdminUsersRequest,
  memoryPublishedTables,
  evaluate,
  baselineTable,
} from "@meridian/rules-engine";
import { isAuthStub } from "@/lib/auth/mode";
import { loadAuthContext } from "@/lib/auth/session";
import { tryReadPublicInsforgeEnv } from "@/lib/insforge/env";
import { invokeAdminUsers } from "@/lib/api/admin-users";
import { stubGetRole, stubListUsers, stubRulesMemory, stubSetRole } from "@/lib/auth/stub-store";

export async function adminUsersAction(
  request: AdminUsersRequest,
): Promise<{ status: number; body: unknown }> {
  const parsed = adminUsersRequestSchema.parse(request);
  const ctx = await loadAuthContext();
  if (!ctx) {
    return { status: 401, body: { error: "UNAUTHENTICATED" } };
  }
  if (isAuthStub()) {
    const memory = stubRulesMemory();
    return handleAdminUsersRequest({
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
        async listUsers() {
          return stubListUsers();
        },
        async assignRole(userId, role) {
          stubSetRole(userId, role);
        },
        async writeAuditLog() {
          return;
        },
      },
    });
  }
  const env = tryReadPublicInsforgeEnv();
  if (!env) {
    return { status: 500, body: { error: "INSFORGE_UNAVAILABLE" } };
  }
  return invokeAdminUsers({
    baseUrl: env.baseUrl,
    accessToken: ctx.accessToken,
    request: parsed,
  });
}
