import { describe, expect, it } from "vitest";
import type { ExecConfig, WorkingOrderMatch } from "@meridian/schemas";
import { applyTickToBook, type CycleOrder, type PaperCycleState } from "./cycle";
import { expandOrderGroup, groupActionsAfterFills } from "./groups";
import { match } from "./match";

const CFG: ExecConfig = { slippage_bps: 0, liquidity_cap: 10_000 };

function working(
  partial: Partial<WorkingOrderMatch> & Pick<WorkingOrderMatch, "id" | "order_type" | "side">,
): WorkingOrderMatch {
  return {
    qty: 10,
    filled_qty: 0,
    ...partial,
  };
}

function cycleOrder(
  partial: Partial<CycleOrder> & Pick<CycleOrder, "id" | "order_type" | "side" | "status">,
): CycleOrder {
  return {
    symbol: "AAPL",
    qty: 10,
    filled_qty: 0,
    reserved_amount: 0,
    ...partial,
  };
}

describe("expandOrderGroup", () => {
  it("expands a buy bracket into entry + TP limit + SL stop", () => {
    const legs = expandOrderGroup({
      symbol: "AAPL",
      side: "buy",
      qty: 4,
      order_type: "market",
      tif: "DAY",
      group_type: "bracket",
      tp_price: 210,
      sl_price: 190,
    });
    expect(legs).toHaveLength(3);
    expect(legs.map((row) => row.leg_role)).toEqual(["entry", "take_profit", "stop_loss"]);
    expect(legs[1]?.draft.side).toBe("sell");
    expect(legs[1]?.draft.order_type).toBe("limit");
    expect(legs[1]?.group_activated).toBe(false);
    expect(legs[2]?.draft.order_type).toBe("stop");
    expect(legs[2]?.draft.stop_price).toBe(190);
  });
});

describe("AC-016-01 bracket entry fill activates children; child fill cancels sibling", () => {
  it("entry fill then TP fill cancels SL", () => {
    const group = "g-bracket";
    const start: PaperCycleState = {
      lastBySymbol: { AAPL: 200 },
      positions: [],
      ledger: { cashBalance: 10_000, reservedCash: 2_000 },
      orders: [
        cycleOrder({
          id: "entry",
          side: "buy",
          order_type: "market",
          status: "accepted",
          reserved_amount: 2_000,
          group_id: group,
          leg_role: "entry",
          group_activated: true,
        }),
        cycleOrder({
          id: "tp",
          side: "sell",
          order_type: "limit",
          limit_price: 210,
          status: "accepted",
          group_id: group,
          leg_role: "take_profit",
          group_activated: false,
        }),
        cycleOrder({
          id: "sl",
          side: "sell",
          order_type: "stop",
          stop_price: 190,
          status: "accepted",
          group_id: group,
          leg_role: "stop_loss",
          group_activated: false,
        }),
      ],
    };

    const afterEntry = applyTickToBook(start, { last: 200, symbol: "AAPL" }, CFG);
    expect(afterEntry.state.orders.find((row) => row.id === "entry")?.status).toBe("filled");
    expect(afterEntry.state.orders.find((row) => row.id === "tp")?.status).toBe("working");
    expect(afterEntry.state.orders.find((row) => row.id === "tp")?.group_activated).toBe(true);
    expect(afterEntry.state.orders.find((row) => row.id === "sl")?.status).toBe("working");

    const afterTp = applyTickToBook(afterEntry.state, { last: 211, symbol: "AAPL" }, CFG);
    expect(afterTp.state.orders.find((row) => row.id === "tp")?.status).toBe("filled");
    expect(afterTp.state.orders.find((row) => row.id === "sl")?.status).toBe("cancelled");
  });

  it("groupActionsAfterFills activates TP/SL only after entry", () => {
    const effect = groupActionsAfterFills(
      [
        { id: "e", group_id: "g", leg_role: "entry", status: "filled" },
        { id: "tp", group_id: "g", leg_role: "take_profit", status: "accepted" },
        { id: "sl", group_id: "g", leg_role: "stop_loss", status: "accepted" },
      ],
      ["e"],
    );
    expect(effect.activateIds.sort()).toEqual(["sl", "tp"]);
    expect(effect.cancelIds).toEqual([]);
  });
});

describe("TC-016-03 OCO same-tick race: stop wins over limit (AC-016-03)", () => {
  it("keeps the stop fill when both legs are marketable", () => {
    const fills = match(
      { last: 100, symbol: "AAPL" },
      [
        working({
          id: "oco-limit",
          side: "sell",
          order_type: "limit",
          limit_price: 99,
          group_id: "oco-1",
          leg_role: "oco_a",
        }),
        working({
          id: "oco-stop",
          side: "sell",
          order_type: "stop",
          stop_price: 101,
          group_id: "oco-1",
          leg_role: "oco_b",
        }),
      ],
      CFG,
    );
    expect(fills).toHaveLength(1);
    expect(fills[0]?.order_id).toBe("oco-stop");
  });
});
