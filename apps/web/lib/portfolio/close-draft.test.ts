import { describe, expect, it } from "vitest";
import { closePositionDraft } from "./close-draft";

describe("closePositionDraft", () => {
  it("prefills opposite market qty for a long", () => {
    expect(closePositionDraft({ symbol: "AAPL", qty: 10 })).toEqual({
      symbol: "AAPL",
      side: "sell",
      qty: 10,
      order_type: "market",
      tif: "DAY",
    });
  });

  it("prefills buy to cover a short", () => {
    expect(closePositionDraft({ symbol: "MSFT", qty: -4 }).side).toBe("buy");
    expect(closePositionDraft({ symbol: "MSFT", qty: -4 }).qty).toBe(4);
  });
});
