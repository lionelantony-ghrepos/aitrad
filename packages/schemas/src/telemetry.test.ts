import { describe, expect, it } from "vitest";
import { healthSnapshotSchema, telemetryRequestSchema } from "./telemetry";

describe("telemetry DTOs", () => {
  it("parses client_error and fn_latency ops", () => {
    expect(
      telemetryRequestSchema.parse({
        op: "client_error",
        panel_id: "watchlist",
        message: "boom",
      }).op,
    ).toBe("client_error");
    expect(
      telemetryRequestSchema.parse({
        op: "fn_latency",
        fn: "order-service",
        request_id: "r1",
        latency_ms: 40,
        outcome: "ok",
      }),
    ).toMatchObject({ fn: "order-service" });
  });

  it("parses a health snapshot", () => {
    const snap = healthSnapshotSchema.parse({
      generated_at: "2026-09-14T12:00:00.000Z",
      functions: [{ fn: "order-service", count: 2, p50_ms: 10, p95_ms: 20, p99_ms: 20 }],
      feed: { ts: "2026-09-14T12:00:00.000Z", session: "OPEN", ticks_applied: 8, age_ms: 200 },
      realtime: { live: 1, reconnecting: 0, offline: 0, connecting: 0, last_ts: null },
    });
    expect(snap.functions[0]?.p95_ms).toBe(20);
  });
});
