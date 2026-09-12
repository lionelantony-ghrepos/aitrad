import { beforeEach, describe, expect, it } from "vitest";
import { expandOrderGroup } from "@meridian/paper-engine";
import type { OrderRecord } from "@meridian/schemas";
import {
  getStubState,
  resetStubState,
  stubInsertOrder,
  stubListOrders,
  stubListPositions,
  stubTryReserve,
} from "@/lib/auth/stub-store";
import { stubApplyTicks } from "./stub-matching";

const USER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACCOUNT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const INSTRUMENT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PARENT = "11111111-1111-4111-8111-111111111111";
const GROUP = "22222222-2222-4222-8222-222222222222";
const CHILD_IDS = [
  "33333333-3333-4333-8333-333333333331",
  "33333333-3333-4333-8333-333333333332",
] as const;

describe("stub matching bracket path", () => {
  beforeEach(() => {
    resetStubState();
    getStubState().accounts.set(USER, {
      id: ACCOUNT,
      user_id: USER,
      cash_balance: 100_000,
      reserved_cash: 0,
      currency: "USD",
      created_at: "2026-09-09T00:00:00.000Z",
      updated_at: "2026-09-09T00:00:00.000Z",
    });
  });

  it("fills entry then TP and cancels SL", () => {
    stubTryReserve(USER, 400);
    const legs = expandOrderGroup({
      symbol: "AAPL",
      side: "buy",
      qty: 2,
      order_type: "market",
      tif: "DAY",
      group_type: "bracket",
      tp_price: 205,
      sl_price: 195,
    });
    const now = "2026-09-09T12:00:00.000Z";
    for (const [index, leg] of legs.entries()) {
      const childId = index === 0 ? PARENT : CHILD_IDS[index - 1];
      if (!childId) {
        throw new Error("bracket fixture missing child id");
      }
      const row: OrderRecord = {
        id: childId,
        user_id: USER,
        account_id: ACCOUNT,
        instrument_id: INSTRUMENT,
        symbol: "AAPL",
        side: leg.draft.side,
        qty: 2,
        filled_qty: 0,
        order_type: leg.draft.order_type,
        limit_price: leg.draft.limit_price ?? null,
        stop_price: leg.draft.stop_price ?? null,
        tif: "DAY",
        status: "accepted",
        reject_reason: null,
        rule_audit_id: null,
        parent_order_id: index === 0 ? null : PARENT,
        group_id: GROUP,
        group_type: "bracket",
        leg_role: leg.leg_role,
        group_activated: leg.group_activated,
        reserved_amount: index === 0 ? 400 : 0,
        created_at: now,
        updated_at: now,
      };
      stubInsertOrder(row);
    }
    stubApplyTicks(USER, [{ last: 200, symbol: "AAPL" }]);
    expect(stubListOrders(USER).find((row) => row.leg_role === "entry")?.status).toBe("filled");
    expect(stubListPositions(USER).find((row) => row.symbol === "AAPL")?.qty).toBe(2);
    expect(stubListOrders(USER).find((row) => row.leg_role === "take_profit")?.status).toBe(
      "working",
    );
    stubApplyTicks(USER, [{ last: 210, symbol: "AAPL" }]);
    expect(stubListOrders(USER).find((row) => row.leg_role === "take_profit")?.status).toBe(
      "filled",
    );
    expect(stubListOrders(USER).find((row) => row.leg_role === "stop_loss")?.status).toBe(
      "cancelled",
    );
  });
});
