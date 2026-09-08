import { describe, expect, it } from "vitest";
import { notionalFromShares, sharesFromNotional } from "./qty-mode";

describe("TC-013-03 notional to shares (AC-013-03)", () => {
  it("converts 1000 notional at 200 last to 5 shares", () => {
    expect(sharesFromNotional(1000, 200)).toBe(5);
    expect(notionalFromShares(5, 200)).toBe(1000);
  });

  it("returns 0 when last is missing", () => {
    expect(sharesFromNotional(1000, 0)).toBe(0);
    expect(notionalFromShares(5, Number.NaN)).toBe(0);
  });
});
