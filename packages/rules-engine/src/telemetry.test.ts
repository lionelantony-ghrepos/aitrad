import { describe, expect, it } from "vitest";
import type { TelemetryRecord } from "@meridian/schemas";
import { authorize, baselineTable, evaluate } from "./index";
import {
  handleHealthServiceRequest,
  handleTelemetryRequest,
  type HealthPorts,
  type TelemetryPorts,
} from "./telemetry";

const ADMIN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TRADER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function authPorts(roles: Record<string, string>): TelemetryPorts["loadRole"] {
  return async (id) => roles[id] ?? null;
}

function telemetryPorts(
  store: TelemetryRecord[],
  roles: Record<string, string>,
  sampleRate = 1,
): TelemetryPorts {
  return {
    loadRole: authPorts(roles),
    evaluateEntitlements: async (ctx) => evaluate(baselineTable("DT-ENT-01"), ctx, new Date()),
    now: () => new Date("2026-09-14T12:00:00.000Z"),
    sampleRate: () => sampleRate,
    async insertTelemetry(row) {
      store.push({
        id: crypto.randomUUID(),
        kind: row.kind,
        fn: row.fn,
        panel_id: row.panel_id,
        request_id: row.request_id,
        user_id: row.user_id,
        latency_ms: row.latency_ms,
        outcome: row.outcome,
        payload: row.payload,
        created_at: "2026-09-14T12:00:00.000Z",
      });
    },
    async writeAuditLog() {
      return;
    },
  };
}

describe("telemetry ingest", () => {
  it("stores a sampled client error for a trader and rejects fn_latency without service key", async () => {
    const store: TelemetryRecord[] = [];
    const ports = telemetryPorts(store, { [TRADER]: "trader" });
    const client = await handleTelemetryRequest({
      method: "POST",
      body: { op: "client_error", panel_id: "watchlist", message: "boom" },
      userId: TRADER,
      isService: false,
      ports,
    });
    expect(client.status).toBe(200);
    expect(store).toHaveLength(1);
    expect(store[0]?.kind).toBe("client_error");

    const denied = await handleTelemetryRequest({
      method: "POST",
      body: {
        op: "fn_latency",
        fn: "order-service",
        request_id: "r1",
        latency_ms: 12,
        outcome: "ok",
      },
      userId: TRADER,
      isService: false,
      ports,
    });
    expect(denied.status).toBe(403);
  });

  it("drops unsampled events", async () => {
    const store: TelemetryRecord[] = [];
    const ports = telemetryPorts(store, { [TRADER]: "trader" }, 0);
    const res = await handleTelemetryRequest({
      method: "POST",
      body: { op: "client_error", panel_id: "chart", message: "x", request_id: "skip" },
      userId: TRADER,
      isService: false,
      ports,
    });
    expect(res.body).toEqual({ stored: false, sampled: false });
    expect(store).toHaveLength(0);
  });
});

describe("health snapshot", () => {
  it("allows admin health:read and denies trader", async () => {
    const rows: TelemetryRecord[] = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        kind: "fn_latency",
        fn: "order-service",
        panel_id: null,
        request_id: "a",
        user_id: null,
        latency_ms: 10,
        outcome: "ok",
        payload: {},
        created_at: "2026-09-14T12:00:00.000Z",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        kind: "fn_latency",
        fn: "order-service",
        panel_id: null,
        request_id: "b",
        user_id: null,
        latency_ms: 40,
        outcome: "ok",
        payload: {},
        created_at: "2026-09-14T12:00:00.000Z",
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        kind: "realtime",
        fn: null,
        panel_id: null,
        request_id: "c",
        user_id: TRADER,
        latency_ms: null,
        outcome: "live",
        payload: {},
        created_at: "2026-09-14T12:00:00.000Z",
      },
    ];
    const ports = (userRoles: Record<string, string>): HealthPorts => ({
      loadRole: authPorts(userRoles),
      evaluateEntitlements: async (ctx) => evaluate(baselineTable("DT-ENT-01"), ctx, new Date()),
      now: () => new Date("2026-09-14T12:00:01.000Z"),
      listTelemetry: async () => rows,
      getFeedHeartbeat: async () => ({
        ts: "2026-09-14T12:00:00.000Z",
        session: "OPEN",
        ticks_applied: 3,
      }),
    });
    const ok = await handleHealthServiceRequest({
      method: "POST",
      body: { op: "snapshot" },
      userId: ADMIN,
      ports: ports({ [ADMIN]: "admin" }),
    });
    expect(ok.status).toBe(200);
    const body = ok.body as {
      functions: Array<{ fn: string; p95_ms: number }>;
      feed: { age_ms: number };
    };
    expect(body.functions[0]?.fn).toBe("order-service");
    expect(body.feed.age_ms).toBe(1000);

    const denied = await handleHealthServiceRequest({
      method: "POST",
      body: { op: "snapshot" },
      userId: TRADER,
      ports: ports({ [TRADER]: "trader" }),
    });
    expect(denied.status).toBe(403);
  });

  it("authorize() allows trader telemetry:write via DT-ENT-01", async () => {
    const result = await authorize({
      userId: TRADER,
      action: "telemetry:write",
      role: "trader",
      table: baselineTable("DT-ENT-01"),
    });
    expect(result.allowed).toBe(true);
  });
});
