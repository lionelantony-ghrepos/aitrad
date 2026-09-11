import { describe, expect, it } from "vitest";
import { handleAdminUsersRequest, type AdminUsersPorts } from "./admin-users";
import { authorize, entitlementHttpStatus } from "./authorize";
import { baselineTable } from "./baseline-tables";
import { handleRulesServiceRequest, type RulesServicePorts } from "./evaluate-domain";
import { evaluate } from "./evaluate";
import { PublishedRulesCache } from "./rules-cache";
import {
  createRulesAdminMemory,
  memoryGetTable,
  memoryListCatalog,
  memoryListHistory,
  memoryPublishDraft,
  memoryPublishedTables,
  memorySaveDraft,
} from "./rules-admin-memory";
import type { AdminUserRow, DecisionTable, UserRole } from "@meridian/schemas";

const IDS: Record<UserRole, string> = {
  trader: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  admin: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  compliance: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
};

const ENDPOINTS: Array<{ name: string; action: string }> = [
  { name: "order-service preview", action: "trade:preview" },
  { name: "order-service create", action: "trade:create" },
  { name: "analytics-service portfolio", action: "portfolio:read" },
  { name: "screener run", action: "screener:run" },
  { name: "rules-service evaluate", action: "rules:evaluate" },
  { name: "rules-service write", action: "rules:write" },
  { name: "admin-users list", action: "users:read" },
  { name: "admin-users assign", action: "users:assign" },
  { name: "audit read", action: "audit:read" },
];

function expectedStatus(role: UserRole, action: string): 200 | 403 {
  const table = baselineTable("DT-ENT-01");
  const verdict = evaluate(table, { role, action }, new Date("2026-09-11T12:00:00.000Z"));
  const decision =
    verdict.outcome && typeof verdict.outcome === "object" && "decision" in verdict.outcome
      ? (verdict.outcome as { decision?: unknown }).decision
      : "deny";
  return decision === "allow" ? 200 : 403;
}

function rulesPorts(memory: ReturnType<typeof createRulesAdminMemory>): RulesServicePorts {
  return {
    async loadPublishedTables(domain) {
      return memoryPublishedTables(memory, domain);
    },
    async writeRuleAudit() {
      return { id: "audit-ent" };
    },
    async writeAuditLog() {
      return;
    },
    async listCatalog() {
      return memoryListCatalog(memory);
    },
    async loadAdminTable(tableKey) {
      return memoryGetTable(memory, tableKey);
    },
    async saveDraft(tableKey, table) {
      return memorySaveDraft(memory, tableKey, table);
    },
    async publishDraft(tableKey) {
      return memoryPublishDraft(memory, tableKey);
    },
    async rollbackToVersion() {
      return { version: 1 };
    },
    async listHistory(tableKey) {
      return memoryListHistory(memory, tableKey);
    },
    async listAudits() {
      return [];
    },
    async loadCallerRole(userId) {
      return memory.roles.get(userId) ?? null;
    },
  };
}

function usersPorts(
  memory: ReturnType<typeof createRulesAdminMemory>,
  directory: AdminUserRow[],
): AdminUsersPorts {
  return {
    async loadRole(userId) {
      return memory.roles.get(userId) ?? null;
    },
    async evaluateEntitlements(ctx) {
      const tables = memoryPublishedTables(memory, "entitlements");
      const table = tables[0]?.table ?? baselineTable("DT-ENT-01");
      return evaluate(table, ctx, new Date("2026-09-11T12:00:00.000Z"));
    },
    async listUsers() {
      return directory;
    },
    async assignRole(userId, role) {
      memory.roles.set(userId, role);
      const row = directory.find((item) => item.user_id === userId);
      if (row) {
        row.role = role;
      }
    },
    async writeAuditLog() {
      return;
    },
  };
}

describe("TC-024-01 matrix 3 roles × protected endpoints (AC-024-01)", () => {
  it("returns 200 or 403 per published DT-ENT-01, deny-by-default", async () => {
    const memory = createRulesAdminMemory();
    for (const [role, id] of Object.entries(IDS) as Array<[UserRole, string]>) {
      memory.roles.set(id, role);
    }
    const cache = new PublishedRulesCache();
    const directory: AdminUserRow[] = Object.entries(IDS).map(([role, user_id]) => ({
      user_id,
      email: `${role}@example.com`,
      display_name: role,
      role: role as UserRole,
    }));

    for (const role of ["trader", "admin", "compliance"] as const) {
      for (const endpoint of ENDPOINTS) {
        const want = expectedStatus(role, endpoint.action);
        const gate = await authorize({
          userId: IDS[role],
          action: endpoint.action,
          ports: usersPorts(memory, directory),
        });
        expect(entitlementHttpStatus(gate), `${role} ${endpoint.name}`).toBe(want);

        if (endpoint.action.startsWith("rules:")) {
          const op =
            endpoint.action === "rules:evaluate"
              ? { domain: "fees" as const, context: { side: "buy" } }
              : {
                  op: "saveDraft" as const,
                  tableKey: "DT-ENT-01",
                  table: baselineTable("DT-ENT-01"),
                };
          const res = await handleRulesServiceRequest({
            method: "POST",
            body: op,
            userId: IDS[role],
            isService: false,
            cache,
            ports: rulesPorts(memory),
          });
          expect(res.status, `${role} handler ${endpoint.name}`).toBe(want);
        }

        if (endpoint.action.startsWith("users:")) {
          const res = await handleAdminUsersRequest({
            method: "POST",
            body:
              endpoint.action === "users:read"
                ? { op: "list" }
                : { op: "assign", user_id: IDS.trader, role: "trader" },
            userId: IDS[role],
            isService: false,
            ports: usersPorts(memory, directory),
          });
          expect(res.status, `${role} handler ${endpoint.name}`).toBe(want);
        }
      }
    }
  });
});

describe("TC-024-02 publish entitlement change without deploy (AC-024-02)", () => {
  it("flips compliance→rules:write in draft, publish, then write succeeds", async () => {
    const memory = createRulesAdminMemory();
    memory.roles.set(IDS.compliance, "compliance");
    memory.roles.set(IDS.admin, "admin");
    const cache = new PublishedRulesCache();
    const ports = rulesPorts(memory);

    const before = await handleRulesServiceRequest({
      method: "POST",
      body: { op: "saveDraft", tableKey: "DT-ENT-01", table: baselineTable("DT-ENT-01") },
      userId: IDS.compliance,
      isService: false,
      cache,
      ports,
    });
    expect(before.status).toBe(403);

    const published = memoryGetTable(memory, "DT-ENT-01");
    const current = published?.published ?? baselineTable("DT-ENT-01");
    const draft: DecisionTable = {
      ...current,
      rows: [
        {
          id: "compliance-write",
          priority: 0,
          conditions: [
            { input: "role", op: "eq", value: "compliance" },
            { input: "action", op: "eq", value: "rules:write" },
          ],
          outputs: { decision: "allow" },
        },
        ...current.rows,
      ],
    };

    const saved = await handleRulesServiceRequest({
      method: "POST",
      body: { op: "saveDraft", tableKey: "DT-ENT-01", table: draft },
      userId: IDS.admin,
      isService: false,
      cache,
      ports,
    });
    expect(saved.status).toBe(200);

    const stillDenied = await handleRulesServiceRequest({
      method: "POST",
      body: { op: "saveDraft", tableKey: "DT-ENT-01", table: draft },
      userId: IDS.compliance,
      isService: false,
      cache,
      ports,
    });
    expect(stillDenied.status).toBe(403);

    const publishedOp = await handleRulesServiceRequest({
      method: "POST",
      body: { op: "publish", tableKey: "DT-ENT-01" },
      userId: IDS.admin,
      isService: false,
      cache,
      ports,
    });
    expect(publishedOp.status).toBe(200);
    cache.invalidate({ event: "rules:published" });

    const after = await handleRulesServiceRequest({
      method: "POST",
      body: { op: "saveDraft", tableKey: "DT-ENT-01", table: draft },
      userId: IDS.compliance,
      isService: false,
      cache,
      ports,
    });
    expect(after.status).toBe(200);
  });
});
