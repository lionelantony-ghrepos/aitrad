import { describe, expect, it } from "vitest";
import { resetStubState } from "../auth/stub-store";
import { invokeEvaluateStub, invokeRulesAdminStub } from "./invoke";

describe("stub rules admin invoke", () => {
  it("lists tables grouped via catalog and denies missing role", async () => {
    resetStubState();
    const denied = await invokeRulesAdminStub({
      userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      role: "trader",
      request: { op: "listCatalog" },
    });
    expect(denied.status).toBe(403);

    const listed = await invokeRulesAdminStub({
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      role: "admin",
      request: { op: "listCatalog" },
    });
    expect(listed.status).toBe(200);
    expect(
      (listed.body as { tables: Array<{ tableKey: string }> }).tables.some(
        (row) => row.tableKey === "DT-RISK-01",
      ),
    ).toBe(true);
  });

  it("evaluates published risk after stub world loads", async () => {
    resetStubState();
    const result = await invokeEvaluateStub({
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      role: "admin",
      request: {
        domain: "pre_trade_risk",
        context: {
          order_notional: 100,
          exceeds_buying_power: false,
          position_pct_post: 1,
          experience_level: "advanced",
          orders_today: 1,
          instrument_beta_class: "low",
          side: "buy",
          exceeds_position_qty: false,
        },
      },
    });
    expect(result.outcome).toEqual({ decision: "allow" });
  });
});
