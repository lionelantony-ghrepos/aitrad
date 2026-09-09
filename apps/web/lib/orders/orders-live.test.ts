import { describe, expect, it } from "vitest";
import { parseOrderRealtimePayload } from "./orders-live";

describe("parseOrderRealtimePayload", () => {
  it("accepts publish_order_event payloads and nested wrappers", () => {
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    expect(parseOrderRealtimePayload({ id, status: "cancelled" })?.status).toBe("cancelled");
    expect(
      parseOrderRealtimePayload({ payload: { id, status: "working", symbol: "AAPL" } })?.symbol,
    ).toBe("AAPL");
    expect(parseOrderRealtimePayload({ data: { id, status: "rejected" } })?.status).toBe(
      "rejected",
    );
    expect(parseOrderRealtimePayload({ nope: true })).toBeNull();
  });
});
