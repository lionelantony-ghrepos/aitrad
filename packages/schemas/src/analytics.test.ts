import { describe, expect, it } from "vitest";
import {
  applyFillToBook,
  assemblePortfolio,
  dailySnapshotDate,
  emptyPositionBook,
  filterEquityCurve,
  revaluePortfolio,
  unrealizedPnl,
  unrealizedPnlPct,
} from "./analytics";

describe("TC-018-01 P&L fixtures (AC-018-02)", () => {
  it("partial-fill lots average cost", () => {
    let book = emptyPositionBook();
    book = applyFillToBook(book, { side: "buy", qty: 50, price: 10 });
    book = applyFillToBook(book, { side: "buy", qty: 50, price: 12 });
    expect(book.qty).toBe(100);
    expect(book.avgCost).toBe(11);
    expect(book.realizedPnl).toBe(0);
  });

  it("add-to-position avg cost then mark unrealized", () => {
    let book = emptyPositionBook();
    book = applyFillToBook(book, { side: "buy", qty: 100, price: 10 });
    book = applyFillToBook(book, { side: "buy", qty: 100, price: 20 });
    expect(book.qty).toBe(200);
    expect(book.avgCost).toBe(15);
    expect(unrealizedPnl(book.qty, book.avgCost, 18)).toBe(600);
  });

  it("sell-half realizes P&L against remaining avg cost", () => {
    let book = emptyPositionBook();
    book = applyFillToBook(book, { side: "buy", qty: 100, price: 10 });
    book = applyFillToBook(book, { side: "buy", qty: 100, price: 20 });
    book = applyFillToBook(book, { side: "sell", qty: 100, price: 25 });
    expect(book.qty).toBe(100);
    expect(book.avgCost).toBe(15);
    expect(book.realizedPnl).toBe(1000);
    expect(unrealizedPnl(book.qty, book.avgCost, 16)).toBe(100);
  });

  it("assembles weights, day P&L, buying power, and +5% unrealized", () => {
    const view = assemblePortfolio({
      account: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        cash: 8_000,
        reserved_cash: 200,
        currency: "USD",
      },
      positions: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          instrument_id: "22222222-2222-4222-8222-222222222222",
          symbol: "AAPL",
          sector: "Technology",
          qty: 10,
          avg_cost: 200,
          realized_pnl: 0,
          last: 210,
          prev_close: 200,
        },
      ],
    });
    expect(view.account.buying_power).toBe(7_800);
    expect(view.account.equity).toBe(10_100);
    expect(view.positions[0]?.unrealized_pnl).toBe(100);
    expect(view.positions[0]?.unrealized_pnl_pct).toBe(5);
    expect(view.positions[0]?.day_pnl).toBe(100);
    expect(view.account.day_pnl).toBe(100);
    expect(view.allocations.by_sector[0]?.key).toBe("Technology");
  });
});

describe("live revalue and snapshot window", () => {
  it("revalues last and day P&L from quotes", () => {
    const base = assemblePortfolio({
      account: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        cash: 0,
        reserved_cash: 0,
        currency: "USD",
      },
      positions: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          instrument_id: "22222222-2222-4222-8222-222222222222",
          symbol: "AAPL",
          sector: "Technology",
          qty: 10,
          avg_cost: 100,
          realized_pnl: 0,
          last: 100,
          prev_close: 100,
        },
      ],
    });
    const next = revaluePortfolio(base, {
      "22222222-2222-4222-8222-222222222222": { last: 105, prev_close: 100 },
    });
    expect(unrealizedPnlPct(10, 100, 105)).toBe(5);
    expect(next.positions[0]?.unrealized_pnl).toBe(50);
    expect(next.positions[0]?.day_pnl).toBe(50);
  });

  it("writes snapshot only after the session close minute", () => {
    expect(
      dailySnapshotDate({
        sessionDate: "2026-09-09",
        session: "OPEN",
        minutes: 600,
        closeMinute: 960,
      }),
    ).toBeNull();
    expect(
      dailySnapshotDate({
        sessionDate: "2026-09-09",
        session: "CLOSED",
        minutes: 961,
        closeMinute: 960,
      }),
    ).toBe("2026-09-09");
    expect(
      dailySnapshotDate({
        sessionDate: "2026-09-09",
        session: "CLOSED",
        minutes: 400,
        closeMinute: 960,
        force: true,
      }),
    ).toBe("2026-09-09");
  });

  it("filters equity curve by range", () => {
    const rows = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        account_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        as_of_date: "2026-06-01",
        equity: 1,
        cash: 1,
        buying_power: 1,
        created_at: "2026-06-01T20:00:00.000Z",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        account_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        as_of_date: "2026-09-01",
        equity: 2,
        cash: 2,
        buying_power: 2,
        created_at: "2026-09-01T20:00:00.000Z",
      },
    ];
    const filtered = filterEquityCurve(rows, "1M", new Date("2026-09-09T00:00:00.000Z"));
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.as_of_date).toBe("2026-09-01");
  });
});
