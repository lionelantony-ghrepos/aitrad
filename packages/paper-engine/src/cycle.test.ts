import { describe, expect, it } from "vitest";
import type { ExecConfig } from "@meridian/schemas";
import {
  applyTickToBook,
  applyTicks,
  bookEquity,
  type CycleOrder,
  type PaperCycleState,
} from "./cycle";

const CFG: ExecConfig = { slippage_bps: 0, liquidity_cap: 10_000 };

function limitBuy(id: string, limit: number): CycleOrder {
  return {
    id,
    symbol: "AAPL",
    side: "buy",
    qty: 10,
    filled_qty: 0,
    order_type: "limit",
    limit_price: limit,
    status: "accepted",
    reserved_amount: 10 * limit,
    created_at: "2026-09-09T12:00:00Z",
  };
}

function openBook(orders: CycleOrder[], cash = 10_000): PaperCycleState {
  return {
    orders,
    positions: [],
    ledger: {
      cashBalance: cash,
      reservedCash: orders.reduce((sum, row) => sum + row.reserved_amount, 0),
    },
    lastBySymbol: { AAPL: 100 },
  };
}

describe("TC-015-03 limit buy below market fills only after a cross (AC-015-02)", () => {
  it("stays working at 100 then fills when the feed is forced through the limit", () => {
    const start = openBook([limitBuy("lb", 95)]);
    const below = applyTickToBook(start, { last: 100, symbol: "AAPL" }, CFG);
    expect(below.fills).toEqual([]);
    expect(below.state.orders[0]?.status).toBe("working");

    const crossed = applyTickToBook(below.state, { last: 94, symbol: "AAPL" }, CFG);
    expect(crossed.fills).toHaveLength(1);
    expect(crossed.fills[0]?.price).toBe(94);
    expect(crossed.state.orders[0]?.status).toBe("filled");
    expect(crossed.state.positions[0]?.qty).toBe(10);
    expect(crossed.state.ledger.cashBalance).toBe(10_000 - 940);
    expect(crossed.state.ledger.reservedCash).toBe(0);
  });
});

describe("TC-015-04 equity = cash + Σ(qty×last) after a fill storm (AC-015-05)", () => {
  it("keeps the mark-to-market identity through mixed fills", () => {
    const orders: CycleOrder[] = [
      {
        id: "b1",
        symbol: "AAPL",
        side: "buy",
        qty: 50,
        filled_qty: 0,
        order_type: "market",
        status: "working",
        reserved_amount: 5_000,
        created_at: "2026-09-09T12:00:00Z",
      },
      {
        id: "b2",
        symbol: "AAPL",
        side: "buy",
        qty: 80,
        filled_qty: 0,
        order_type: "market",
        status: "working",
        reserved_amount: 8_000,
        created_at: "2026-09-09T12:00:01Z",
      },
      {
        id: "s1",
        symbol: "AAPL",
        side: "sell",
        qty: 40,
        filled_qty: 0,
        order_type: "market",
        status: "accepted",
        reserved_amount: 0,
        created_at: "2026-09-09T12:00:02Z",
      },
    ];
    const start = openBook(orders, 20_000);
    const storm = applyTicks(
      start,
      [
        { last: 100, symbol: "AAPL" },
        { last: 101, symbol: "AAPL" },
        { last: 99, symbol: "AAPL" },
      ],
      { slippage_bps: 0, liquidity_cap: 30 },
    );

    expect(storm.fills.length).toBeGreaterThan(1);
    expect(storm.state.orders.every((row) => row.filled_qty > 0)).toBe(true);

    const cash = storm.state.ledger.cashBalance;
    const marked = storm.state.positions.reduce(
      (sum, pos) => sum + pos.qty * (storm.state.lastBySymbol[pos.symbol] ?? 0),
      0,
    );
    expect(bookEquity(storm.state)).toBeCloseTo(cash + marked, 8);

    const execNotional = storm.fills.reduce((sum, fill) => {
      return sum + (fill.side === "buy" ? -fill.qty * fill.price : fill.qty * fill.price);
    }, 0);
    expect(cash).toBeCloseTo(20_000 + execNotional, 8);
  });
});
