import { describe, expect, it } from "vitest";
import {
  stubInstrumentBySymbol,
  stubMarketBars,
  STUB_AAPL_INSTRUMENT_ID,
} from "../auth/stub-store";

describe("stub chart bars", () => {
  it("returns 1m history for AAPL after a cutoff", () => {
    expect(stubInstrumentBySymbol("aapl")?.id).toBe(STUB_AAPL_INSTRUMENT_ID);
    const bars = stubMarketBars(STUB_AAPL_INSTRUMENT_ID, "1m", "2020-01-01T00:00:00.000Z");
    expect(bars.length).toBeGreaterThan(0);
    expect(bars.every((row) => row.timeframe === "1m")).toBe(true);
    expect(bars.at(-1)?.instrument_id).toBe(STUB_AAPL_INSTRUMENT_ID);
  });
});
