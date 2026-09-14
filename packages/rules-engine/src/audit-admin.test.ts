import { describe, expect, it } from "vitest";
import type { AuditLog } from "@meridian/schemas";
import { handleAuditServiceRequest, type AuditAdminPorts } from "./audit-admin";
import { appendAuditChainRow, verifyAuditChain } from "./audit-chain";
import { authorize, entitlementHttpStatus } from "./authorize";
import { baselineTable } from "./baseline-tables";
import { evaluate } from "./evaluate";

const IDS = {
  trader: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  admin: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  compliance: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
} as const;

function seedRows(): AuditLog[] {
  const first = appendAuditChainRow(null, {
    id: "11111111-1111-4111-8111-111111111111",
    user_id: IDS.trader,
    action: "trade:create",
    entity_type: "orders",
    entity_id: "22222222-2222-4222-8222-222222222222",
    payload: { status: "accepted" },
    created_at: "2026-09-14T10:00:00.000Z",
  });
  const second = appendAuditChainRow(first, {
    id: "33333333-3333-4333-8333-333333333333",
    user_id: IDS.trader,
    action: "trade:cancel",
    entity_type: "orders",
    entity_id: "22222222-2222-4222-8222-222222222222",
    payload: { from: "accepted", to: "cancelled" },
    created_at: "2026-09-14T10:02:00.000Z",
  });
  return [first, second];
}

function ports(role: keyof typeof IDS, db: AuditLog[]): AuditAdminPorts & { audits: string[] } {
  const audits: string[] = [];
  let retention: number | null = null;
  let cronDay: string | null = null;
  let chain = verifyAuditChain(db);
  const table = baselineTable("DT-ENT-01");
  return {
    audits,
    async loadRole() {
      return role;
    },
    async evaluateEntitlements(ctx) {
      return evaluate(table, ctx, new Date("2026-09-14T12:00:00.000Z"));
    },
    async listAudit(filter) {
      let rows = [...db];
      if (filter.user_id) {
        rows = rows.filter((row) => row.user_id === filter.user_id);
      }
      if (filter.action) {
        rows = rows.filter((row) => row.action === filter.action);
      }
      if (filter.entity_type) {
        rows = rows.filter((row) => row.entity_type === filter.entity_type);
      }
      if (filter.entity_id) {
        rows = rows.filter((row) => row.entity_id === filter.entity_id);
      }
      return { rows, total: rows.length };
    },
    async verifyChain() {
      return verifyAuditChain(db);
    },
    async getRetentionDays() {
      return retention;
    },
    async setRetentionDays(days) {
      retention = days;
    },
    async applyRetention() {
      return 0;
    },
    async listAdminUserIds() {
      return [IDS.admin];
    },
    async loadChainStatus() {
      return chain;
    },
    async saveChainStatus(status) {
      chain = status;
    },
    utcDay() {
      return "2026-09-14";
    },
    async lastCronDay() {
      return cronDay;
    },
    async markCronDay(day) {
      cronDay = day;
    },
    async writeAuditLog(row) {
      audits.push(row.action);
    },
  };
}

describe("TC-029-03 role access on audit admin (AC-029-03)", () => {
  it("allows admin+compliance read; trader none; compliance cannot set retention", async () => {
    const db = seedRows();
    for (const role of ["trader", "admin", "compliance"] as const) {
      const p = ports(role, db);
      const list = await handleAuditServiceRequest({
        method: "POST",
        body: { op: "list" },
        userId: IDS[role],
        isService: false,
        ports: p,
      });
      const write = await handleAuditServiceRequest({
        method: "POST",
        body: { op: "setRetention", days: 30 },
        userId: IDS[role],
        isService: false,
        ports: p,
      });
      const gateRead = await authorize({
        userId: IDS[role],
        action: "audit:read",
        ports: p,
      });
      expect(entitlementHttpStatus(gateRead), `${role} audit:read`).toBe(
        list.status === 200 ? 200 : 403,
      );
      if (role === "trader") {
        expect(list.status).toBe(403);
        expect(write.status).toBe(403);
      }
      if (role === "compliance") {
        expect(list.status).toBe(200);
        expect((list.body as { can_write: boolean }).can_write).toBe(false);
        expect(write.status).toBe(403);
      }
      if (role === "admin") {
        expect(list.status).toBe(200);
        expect((list.body as { can_write: boolean }).can_write).toBe(true);
        expect(write.status).toBe(200);
        expect(p.audits).toContain("audit:set_retention");
      }
    }
  });
});

describe("audit-service cron", () => {
  it("alerts admins when the chain is broken", async () => {
    const db = seedRows();
    const secondRow = db[1];
    if (!secondRow) {
      throw new Error("expected second audit row");
    }
    db[1] = { ...secondRow, payload: { tampered: true } };
    const p = ports("admin", db);
    const res = await handleAuditServiceRequest({
      method: "POST",
      body: { op: "cron", force: true },
      userId: null,
      isService: true,
      ports: p,
    });
    expect(res.status).toBe(200);
    expect((res.body as { verified: boolean }).verified).toBe(false);
    expect((res.body as { alerted: number }).alerted).toBe(1);
    expect(p.audits).toContain("audit:chain_mismatch");
    expect(p.audits).toContain("audit:cron");
  });
});
