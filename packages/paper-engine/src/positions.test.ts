import { describe, expect, it } from "vitest";
import { applyFillToPosition, emptyPosition, markEquity } from "./positions";

describe("TC-015-02 avg cost and realized P&L (AC-015-04)", () => {
  it("buy 100@10, buy 100@20 → avg 15; sell 100@25 → realized +1000", () => {
    let pos = emptyPosition();
    pos = applyFillToPosition(pos, { side: "buy", qty: 100, price: 10 });
    pos = applyFillToPosition(pos, { side: "buy", qty: 100, price: 20 });
    expect(pos.qty).toBe(200);
    expect(pos.avgCost).toBe(15);
    expect(pos.realizedPnl).toBe(0);
    pos = applyFillToPosition(pos, { side: "sell", qty: 100, price: 25 });
    expect(pos.qty).toBe(100);
    expect(pos.avgCost).toBe(15);
    expect(pos.realizedPnl).toBe(1000);
  });
});

describe("mark equity identity", () => {
  it("is cash plus marked quantity", () => {
    expect(markEquity(500, [{ symbol: "AAPL", qty: 10 }], { AAPL: 20 })).toBe(700);
  });
});
