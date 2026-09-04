import { describe, expect, it } from "vitest";
import { parseTickBatchPayload } from "./transport";

describe("tick_batch payload parse", () => {
  it("accepts a quoteTickBatch or a wrapped payload", () => {
    const batch = {
      ts: "2026-09-04T14:00:00.000Z",
      ticks: [
        {
          instrument_id: "11111111-1111-4111-8111-111111111111",
          symbol: "AAPL",
          bid: 1,
          ask: 2,
          last: 1.5,
          prev_close: 1,
          volume: 10,
          ts: "2026-09-04T14:00:00.000Z",
        },
      ],
    };
    expect(parseTickBatchPayload(batch)?.ticks).toHaveLength(1);
    expect(parseTickBatchPayload({ payload: batch })?.ticks[0]?.last).toBe(1.5);
    expect(parseTickBatchPayload({ nope: true })).toBeNull();
  });
});
