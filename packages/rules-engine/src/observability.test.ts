import { describe, expect, it } from "vitest";
import {
  buildFunctionLog,
  formatFunctionLog,
  isFeedStale,
  nextRealtimeBackoffMs,
  nextRealtimeState,
  percentileNearestRank,
  parseTelemetrySampleRate,
  shouldSampleTelemetry,
  userIdFromAuthorization,
} from "./observability";

describe("function logger helpers", () => {
  it("emits JSON with request_id, user_id, fn, latency_ms, outcome", () => {
    const line = formatFunctionLog(
      buildFunctionLog({
        request_id: "abc",
        user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        fn: "order-service",
        latency_ms: 18,
        outcome: "ok",
        status: 200,
      }),
    );
    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(parsed.request_id).toBe("abc");
    expect(parsed.fn).toBe("order-service");
    expect(parsed.latency_ms).toBe(18);
    expect(parsed.outcome).toBe("ok");
  });

  it("reads sub from a JWT-shaped bearer token", () => {
    const payload = Buffer.from(
      JSON.stringify({ sub: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
      "utf8",
    ).toString("base64url");
    const token = `Bearer aaa.${payload}.sig`;
    expect(userIdFromAuthorization(token)).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });
});

describe("sampling, stale, backoff", () => {
  it("samples deterministically", () => {
    expect(shouldSampleTelemetry("always", 1)).toBe(true);
    expect(shouldSampleTelemetry("never", 0)).toBe(false);
    expect(shouldSampleTelemetry("r1", 0.5)).toBe(shouldSampleTelemetry("r1", 0.5));
    expect(parseTelemetrySampleRate("0.2")).toBe(0.2);
  });

  it("shows STALE only while OPEN and last tick is older than the gap", () => {
    expect(isFeedStale({ lastTickMs: 0, nowMs: 11_000, session: "OPEN" })).toBe(true);
    expect(isFeedStale({ lastTickMs: 9_000, nowMs: 11_000, session: "OPEN" })).toBe(false);
    expect(isFeedStale({ lastTickMs: 0, nowMs: 11_000, session: "CLOSED" })).toBe(false);
  });

  it("uses exponential backoff capped at max", () => {
    expect(nextRealtimeBackoffMs(0, 250, 8000)).toBe(250);
    expect(nextRealtimeBackoffMs(1, 250, 8000)).toBe(500);
    expect(nextRealtimeBackoffMs(10, 250, 8000)).toBe(8000);
    expect(nextRealtimeState({ current: "live", event: "close" })).toBe("reconnecting");
    expect(nextRealtimeState({ current: "reconnecting", event: "open" })).toBe("live");
  });

  it("computes nearest-rank percentiles", () => {
    expect(percentileNearestRank([10, 20, 30, 40, 50], 95)).toBe(50);
    expect(percentileNearestRank([], 95)).toBeNull();
  });
});
