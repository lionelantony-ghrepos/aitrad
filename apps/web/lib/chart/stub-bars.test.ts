import { describe, expect, it } from "vitest";
import {
  stubInstrumentBySymbol,
  stubMarketBars,
  STUB_AAPL_INSTRUMENT_ID,
} from "../auth/stub-store";
import { tsCutoffIso } from "./range";

describe("stub chart bars", () => {
  it("returns 1m history for AAPL after a cutoff", () => {
    expect(stubInstrumentBySymbol("aapl")?.id).toBe(STUB_AAPL_INSTRUMENT_ID);
    const bars = stubMarketBars(STUB_AAPL_INSTRUMENT_ID, "1m", "2020-01-01T00:00:00.000Z");
    expect(bars.length).toBeGreaterThan(0);
    expect(bars.every((row) => row.timeframe === "1m")).toBe(true);
    expect(bars.at(-1)?.instrument_id).toBe(STUB_AAPL_INSTRUMENT_ID);
  });

  it("keeps 1m bars inside the 1D lookback when the clock has moved past STUB_TS", () => {
    const now = new Date("2026-09-07T16:49:00.000Z");
    const bars = stubMarketBars(STUB_AAPL_INSTRUMENT_ID, "1m", tsCutoffIso("1D", now), now);
    const first = bars[0];
    const last = bars.at(-1);
    expect(first).toBeDefined();
    expect(last).toBeDefined();
    if (!first || !last) {
      return;
    }
    expect(Date.parse(first.ts)).toBeGreaterThanOrEqual(Date.parse(tsCutoffIso("1D", now)));
    expect(Date.parse(last.ts)).toBeLessThanOrEqual(now.getTime());
  });
});
