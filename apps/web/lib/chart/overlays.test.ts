import { describe, expect, it } from "vitest";
import { computeOverlays } from "./overlays";
import type { MarketBar } from "@meridian/schemas";

describe("chart overlay series", () => {
  it("aligns SMA(20) nulls until twenty closes exist", () => {
    const bars: MarketBar[] = Array.from({ length: 20 }, (_, i) => ({
      instrument_id: "11111111-1111-4111-8111-111111111111",
      timeframe: "1d",
      ts: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
      o: 1,
      h: 1,
      l: 1,
      c: i + 1,
      v: 10,
    }));
    const series = computeOverlays(bars);
    expect(series.sma20[18]).toBeNull();
    expect(series.sma20[19]).toBeCloseTo(10.5, 10);
  });
});
