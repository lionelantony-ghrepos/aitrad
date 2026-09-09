import { describe, expect, it } from "vitest";
import { ema, latestDefined, packageName, rsi, rsi14Last, sma, vwap } from "./index";

describe("TC-008-02 indicators vs known vectors", () => {
  it("exports the package name", () => {
    expect(packageName).toBe("@meridian/indicators");
  });

  it("computes SMA(3) with leading nulls until the window fills", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });

  it("computes EMA(2) seeded from SMA then Wilder-style k=2/(n+1)", () => {
    const values = ema([1, 2, 3], 2);
    expect(values[0]).toBeNull();
    expect(values[1]).toBeCloseTo(1.5, 10);
    expect(values[2]).toBeCloseTo(2.5, 10);
  });

  it("computes cumulative VWAP from typical price (H+L+C)/3", () => {
    const series = vwap([
      { h: 11, l: 9, c: 10, v: 100 },
      { h: 12, l: 10, c: 11, v: 100 },
    ]);
    expect(series[0]).toBeCloseTo(10, 10);
    expect(series[1]).toBeCloseTo(10.5, 10);
  });

  it("computes Wilder RSI(2) on a short close series", () => {
    const series = rsi([10, 12, 11, 13], 2);
    expect(series[0]).toBeNull();
    expect(series[1]).toBeNull();
    expect(series[2]).toBeCloseTo(100 - 100 / 3, 10);
    const avgGain3 = (1 * 1 + 2) / 2;
    const avgLoss3 = (0.5 * 1 + 0) / 2;
    const expected = 100 - 100 / (1 + avgGain3 / avgLoss3);
    expect(series[3]).toBeCloseTo(expected, 10);
  });

  it("returns empty arrays for empty input", () => {
    expect(sma([], 20)).toEqual([]);
    expect(ema([], 12)).toEqual([]);
    expect(rsi([], 14)).toEqual([]);
    expect(vwap([])).toEqual([]);
    expect(rsi14Last([])).toBeNull();
    expect(latestDefined([null, undefined])).toBeNull();
  });

  it("returns the last defined RSI(14) point", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    const series = rsi(closes, 14);
    expect(rsi14Last(closes)).toBe(latestDefined(series));
    expect(rsi14Last(closes)).not.toBeNull();
  });
});
