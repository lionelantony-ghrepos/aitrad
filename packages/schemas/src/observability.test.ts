import { describe, expect, it } from "vitest";
import {
  ARCHITECTURE_PREVIEW_LOAD_RPS,
  ARCHITECTURE_REST_P95_MS,
  ARCHITECTURE_WORKSPACE_TTI_MS,
  FEED_STALE_AFTER_MS,
  functionLogSchema,
} from "./observability";

describe("observability schemas", () => {
  it("parses a function log line", () => {
    const parsed = functionLogSchema.parse({
      request_id: "req-1",
      user_id: null,
      fn: "order-service",
      latency_ms: 12,
      outcome: "ok",
      status: 200,
    });
    expect(parsed.fn).toBe("order-service");
  });

  it("exposes architecture engineering budgets", () => {
    expect(ARCHITECTURE_REST_P95_MS).toBe(300);
    expect(ARCHITECTURE_WORKSPACE_TTI_MS).toBe(3000);
    expect(ARCHITECTURE_PREVIEW_LOAD_RPS).toBe(50);
    expect(FEED_STALE_AFTER_MS).toBe(10_000);
  });
});
