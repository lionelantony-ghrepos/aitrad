import { describe, expect, it } from "vitest";
import { applyQuoteToCandles, candleBucketStart, timeframeForRange, tsCutoffIso } from "./range";
import type { MarketBar } from "@meridian/schemas";

const INSTRUMENT = "11111111-1111-4111-8111-111111111111";

function bar(partial: Partial<MarketBar> & Pick<MarketBar, "ts" | "c" | "timeframe">): MarketBar {
  return {
    instrument_id: INSTRUMENT,
    o: partial.o ?? partial.c,
    h: partial.h ?? partial.c,
    l: partial.l ?? partial.c,
    v: partial.v ?? 100,
    ...partial,
  };
}

describe("chart range mapping", () => {
  it("uses 1m bars only for 1D and 1d bars for 1W-5Y", () => {
    expect(timeframeForRange("1D")).toBe("1m");
    expect(timeframeForRange("1W")).toBe("1d");
    expect(timeframeForRange("1M")).toBe("1d");
    expect(timeframeForRange("1Y")).toBe("1d");
    expect(timeframeForRange("5Y")).toBe("1d");
  });

  it("cuts 1D to the prior session window and 5Y to five years", () => {
    const now = new Date("2026-09-04T20:00:00.000Z");
    const day = Date.parse(tsCutoffIso("1D", now));
    const fiveY = Date.parse(tsCutoffIso("5Y", now));
    expect(now.getTime() - day).toBe(36 * 60 * 60 * 1000);
    expect(now.getTime() - fiveY).toBe(5 * 365 * 24 * 60 * 60 * 1000);
  });
});

describe("applyQuoteToCandles", () => {
  it("updates the last candle close/high/low when the tick is in the same bucket", () => {
    const existing = [
      bar({ timeframe: "1m", ts: "2026-09-04T14:00:00.000Z", o: 10, h: 11, l: 9, c: 10.5, v: 50 }),
    ];
    const next = applyQuoteToCandles(existing, {
      last: 12,
      volume: 80,
      ts: "2026-09-04T14:00:30.000Z",
      instrument_id: INSTRUMENT,
    });
    expect(next).toHaveLength(1);
    expect(next[0]?.c).toBe(12);
    expect(next[0]?.h).toBe(12);
    expect(next[0]?.l).toBe(9);
    expect(next[0]?.o).toBe(10);
  });

  it("appends a new 1m candle when the tick is in a later minute", () => {
    const existing = [bar({ timeframe: "1m", ts: "2026-09-04T14:00:00.000Z", c: 10, v: 50 })];
    const next = applyQuoteToCandles(existing, {
      last: 11,
      volume: 51,
      ts: "2026-09-04T14:01:05.000Z",
      instrument_id: INSTRUMENT,
    });
    expect(next).toHaveLength(2);
    expect(next[1]?.o).toBe(11);
    expect(next[1]?.c).toBe(11);
    expect(candleBucketStart("2026-09-04T14:01:05.000Z", "1m")).toBe("2026-09-04T14:01:00.000Z");
  });

  it("still writes last into the current candle when the tick timestamp is earlier", () => {
    const existing = [bar({ timeframe: "1m", ts: "2026-09-04T14:00:00.000Z", c: 10, v: 50 })];
    const next = applyQuoteToCandles(existing, {
      last: 200,
      volume: 2,
      ts: "2026-09-04T12:00:00.000Z",
      instrument_id: INSTRUMENT,
    });
    expect(next).toHaveLength(1);
    expect(next[0]?.c).toBe(200);
  });
});
