import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_QUOTE_RENDERS_PER_SEC,
  QUOTE_FLUSH_INTERVAL_MS,
  createQuoteCoalescer,
} from "./coalesce";
import type { QuoteTick } from "@meridian/schemas";

const INSTRUMENT = "11111111-1111-4111-8111-111111111111";

function tick(last: number, ts = "2026-09-04T14:00:00.000Z"): QuoteTick {
  return {
    instrument_id: INSTRUMENT,
    symbol: "AAPL",
    bid: last - 0.01,
    ask: last + 0.01,
    last,
    prev_close: 100,
    volume: 1,
    ts,
  };
}

describe("quote coalescer (AC-007-02)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("caps flushes at 4 per second under a burst of ticks", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T14:00:00.000Z"));
    const flushes: number[][] = [];
    const coalescer = createQuoteCoalescer({
      maxFlushesPerSec: MAX_QUOTE_RENDERS_PER_SEC,
      onFlush: (ticks) => {
        flushes.push(ticks.map((t) => t.last));
      },
    });

    for (let i = 0; i < 40; i += 1) {
      coalescer.push([tick(100 + i)]);
      vi.advanceTimersByTime(20);
    }
    vi.advanceTimersByTime(QUOTE_FLUSH_INTERVAL_MS);
    coalescer.dispose();
    expect(flushes.length).toBeLessThanOrEqual(MAX_QUOTE_RENDERS_PER_SEC);
    expect(flushes.length).toBeGreaterThan(0);
    const lastFlush = flushes[flushes.length - 1];
    expect(lastFlush?.[lastFlush.length - 1]).toBe(139);
  });

  it("keeps the latest tick per instrument when coalescing a batch", () => {
    vi.useFakeTimers();
    const flushes: QuoteTick[][] = [];
    const coalescer = createQuoteCoalescer({
      maxFlushesPerSec: MAX_QUOTE_RENDERS_PER_SEC,
      onFlush: (ticks) => {
        flushes.push(ticks);
      },
    });
    coalescer.push([tick(101), tick(102)]);
    vi.advanceTimersByTime(250);
    coalescer.dispose();
    expect(flushes).toHaveLength(1);
    expect(flushes[0]).toHaveLength(1);
    expect(flushes[0]?.[0]?.last).toBe(102);
  });
});
