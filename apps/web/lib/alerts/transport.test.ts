import { describe, expect, it } from "vitest";
import { parseAlertRealtimePayload } from "./transport";

describe("parseAlertRealtimePayload", () => {
  it("accepts wrapped realtime envelopes", () => {
    const alert = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      user_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      alert_rule_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      instrument_id: null,
      fired_at: "2026-09-09T14:00:00.000Z",
      message: "AAPL above 200",
      payload: {},
      read: false,
      created_at: "2026-09-09T14:00:00.000Z",
    };
    expect(parseAlertRealtimePayload({ kind: "alert", alert })?.id).toBe(alert.id);
    expect(parseAlertRealtimePayload({ payload: { kind: "alert", alert } })?.message).toBe(
      "AAPL above 200",
    );
  });
});
