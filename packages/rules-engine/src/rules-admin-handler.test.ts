import { describe, expect, it } from "vitest";
import { handleRulesServiceRequest, type RulesServicePorts } from "./evaluate-domain";
import { PublishedRulesCache } from "./rules-cache";
import {
  createRulesAdminMemory,
  memoryGetTable,
  memoryListCatalog,
  memoryListHistory,
  memoryPublishDraft,
  memoryPublishedTables,
  memoryRollback,
  memorySaveDraft,
} from "./rules-admin-memory";
import { baselineTable } from "./baseline-tables";

function adminPorts(roleByUser: Record<string, string>): {
  ports: RulesServicePorts;
  memory: ReturnType<typeof createRulesAdminMemory>;
} {
  const memory = createRulesAdminMemory();
  const ports: RulesServicePorts = {
    async loadPublishedTables(domain) {
      return memoryPublishedTables(memory, domain);
    },
    async writeRuleAudit() {
      return { id: "audit-x" };
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
    async rollbackToVersion(tableKey, version) {
      return memoryRollback(memory, tableKey, version);
    },
    async listHistory(tableKey) {
      return memoryListHistory(memory, tableKey);
    },
    async listAudits(input) {
      return memory.audits
        .filter((row) => !input.domain || row.domain === input.domain)
        .slice(0, input.limit ?? 50);
    },
    async loadCallerRole(userId) {
      return roleByUser[userId] ?? null;
    },
  };
  return { ports, memory };
}

describe("TC-012 admin ops", () => {
  it("denies trader catalog and allows admin draft→simulate→publish", async () => {
    const adminId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const traderId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const { ports, memory } = adminPorts({ [adminId]: "admin", [traderId]: "trader" });
    const cache = new PublishedRulesCache();

    const denied = await handleRulesServiceRequest({
      method: "POST",
      body: { op: "listCatalog" },
      userId: traderId,
      isService: false,
      cache,
      ports,
    });
    expect(denied.status).toBe(403);

    const listed = await handleRulesServiceRequest({
      method: "POST",
      body: { op: "listCatalog" },
      userId: adminId,
      isService: false,
      cache,
      ports,
    });
    expect(listed.status).toBe(200);
    const tables = (listed.body as { tables: Array<{ tableKey: string }> }).tables;
    expect(tables.some((row) => row.tableKey === "DT-RISK-01")).toBe(true);

    const original = baselineTable("DT-RISK-01");
    const draftTable = {
      ...original,
      rows: original.rows.map((row) =>
        row.id === "2"
          ? {
              ...row,
              conditions: row.conditions.map((cell) =>
                cell.input === "order_notional" ? { ...cell, value: 1_000 } : cell,
              ),
            }
          : row,
      ),
    };
    const saved = await handleRulesServiceRequest({
      method: "POST",
      body: { op: "saveDraft", tableKey: "DT-RISK-01", table: draftTable },
      userId: adminId,
      isService: false,
      cache,
      ports,
    });
    expect(saved.status).toBe(200);
    expect((saved.body as { diff: { changedRowIds: string[] } }).diff.changedRowIds).toEqual(["2"]);

    const sim = await handleRulesServiceRequest({
      method: "POST",
      body: { op: "simulate", tableKey: "DT-RISK-01" },
      userId: adminId,
      isService: false,
      cache,
      ports,
    });
    expect(sim.status).toBe(200);
    expect((sim.body as { agreementPct: number }).agreementPct).toBeLessThan(100);

    const published = await handleRulesServiceRequest({
      method: "POST",
      body: { op: "publish", tableKey: "DT-RISK-01" },
      userId: adminId,
      isService: false,
      cache,
      ports,
    });
    expect(published).toEqual({
      status: 200,
      body: { ok: true, tableKey: "DT-RISK-01", version: 2, event: "rules:published" },
    });
    expect(memoryPublishedTables(memory, "pre_trade_risk")[0]?.version).toBe(2);
  });
});
