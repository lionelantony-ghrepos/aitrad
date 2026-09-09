import { describe, expect, it } from "vitest";
import type { ExecutionRecord, OrderRecord } from "@meridian/schemas";
import {
  avgFillPx,
  blotterCsvRows,
  buildBlotterTree,
  canModifyOrder,
  emptyBlotterFilters,
  filterBlotterRows,
  orderMatchesFilters,
  tabIncludesStatus,
  toCsv,
} from "./view";

function order(
  partial: Partial<OrderRecord> & Pick<OrderRecord, "id" | "symbol" | "status">,
): OrderRecord {
  return {
    user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    account_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    instrument_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    side: "buy",
    qty: 2,
    filled_qty: 0,
    order_type: "limit",
    limit_price: 100,
    stop_price: null,
    tif: "DAY",
    reject_reason: null,
    rule_audit_id: null,
    created_at: "2026-09-09T12:00:00.000Z",
    updated_at: "2026-09-09T12:00:00.000Z",
    ...partial,
  };
}

describe("blotter view TC-017-03 / AC-017-03", () => {
  it("tabs include the documented working statuses", () => {
    expect(tabIncludesStatus("working", "accepted")).toBe(true);
    expect(tabIncludesStatus("working", "working")).toBe(true);
    expect(tabIncludesStatus("working", "partially_filled")).toBe(true);
    expect(tabIncludesStatus("working", "filled")).toBe(false);
    expect(tabIncludesStatus("filled", "filled")).toBe(true);
    expect(tabIncludesStatus("rejected", "rejected")).toBe(true);
    expect(tabIncludesStatus("all", "cancelled")).toBe(true);
  });

  it("filters by symbol/side/status/date and CSV matches the grid", () => {
    const aapl = order({
      id: "11111111-1111-4111-8111-111111111111",
      symbol: "AAPL",
      status: "working",
    });
    const msft = order({
      id: "22222222-2222-4222-8222-222222222222",
      symbol: "MSFT",
      status: "working",
      side: "sell",
      created_at: "2026-09-10T12:00:00.000Z",
    });
    const filters = { ...emptyBlotterFilters(), symbol: "AAPL" };
    expect(orderMatchesFilters(aapl, filters)).toBe(true);
    expect(orderMatchesFilters(msft, filters)).toBe(false);
    const rows = filterBlotterRows([aapl, msft], "all", filters);
    expect(rows.map((row) => row.order.symbol)).toEqual(["AAPL"]);
    const csv = toCsv(blotterCsvRows(rows, []));
    expect(csv).toContain("AAPL");
    expect(csv).not.toContain("MSFT");
    expect(csv.split("\n")).toHaveLength(2);
  });

  it("builds a group tree with entry parent and legs", () => {
    const entry = order({
      id: "11111111-1111-4111-8111-111111111111",
      symbol: "AAPL",
      status: "filled",
      group_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      leg_role: "entry",
    });
    const tp = order({
      id: "22222222-2222-4222-8222-222222222222",
      symbol: "AAPL",
      status: "working",
      group_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      leg_role: "take_profit",
    });
    const tree = buildBlotterTree([tp, entry]);
    expect(tree[0]?.order.leg_role).toBe("entry");
    expect(tree[0]?.hasChildren).toBe(true);
    expect(tree[1]?.depth).toBe(1);
    expect(tree[1]?.order.leg_role).toBe("take_profit");
  });

  it("avg fill is qty-weighted and modify follows cancel FSM", () => {
    const fills: ExecutionRecord[] = [
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
        order_id: "11111111-1111-4111-8111-111111111111",
        user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        account_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        instrument_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        symbol: "AAPL",
        side: "buy",
        qty: 1,
        price: 10,
        created_at: "2026-09-09T12:00:00.000Z",
      },
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2",
        order_id: "11111111-1111-4111-8111-111111111111",
        user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        account_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        instrument_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        symbol: "AAPL",
        side: "buy",
        qty: 3,
        price: 20,
        created_at: "2026-09-09T12:01:00.000Z",
      },
    ];
    expect(avgFillPx("11111111-1111-4111-8111-111111111111", fills)).toBe(17.5);
    expect(canModifyOrder("working")).toBe(true);
    expect(canModifyOrder("filled")).toBe(false);
  });
});
