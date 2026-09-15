import {
  healthSnapshotSchema,
  telemetryIngestResponseSchema,
  telemetryKindSchema,
  telemetryRequestSchema,
  type HealthSnapshot,
  type TelemetryKind,
  type TelemetryRecord,
  type TelemetryRequest,
} from "@meridian/schemas";
import { authorize, entitlementHttpStatus, type AuthorizePorts } from "./authorize";
import { percentileNearestRank, shouldSampleTelemetry } from "./observability";

export type TelemetryPorts = AuthorizePorts & {
  now: () => Date;
  sampleRate: () => number;
  insertTelemetry: (row: {
    kind: TelemetryKind;
    fn: string | null;
    panel_id: string | null;
    request_id: string | null;
    user_id: string | null;
    latency_ms: number | null;
    outcome: string | null;
    payload: Record<string, unknown>;
  }) => Promise<void>;
  writeAuditLog: (row: {
    user_id: string | null;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    payload: Record<string, unknown>;
  }) => Promise<void>;
};

export async function handleTelemetryRequest(input: {
  method: string;
  body: unknown;
  userId: string | null;
  isService: boolean;
  ports: TelemetryPorts;
}): Promise<{ status: number; body: unknown }> {
  if (input.method !== "POST") {
    return { status: 405, body: { error: "METHOD_NOT_ALLOWED" } };
  }
  const parsed = telemetryRequestSchema.safeParse(input.body);
  if (!parsed.success) {
    return { status: 400, body: { error: "INVALID_TELEMETRY" } };
  }
  const req = parsed.data;
  if (req.op === "fn_latency") {
    if (!input.isService) {
      return { status: 403, body: { error: "SERVICE_KEY_REQUIRED" } };
    }
    return ingest(input.ports, req, null, true);
  }
  if (!input.userId) {
    return { status: 401, body: { error: "UNAUTHENTICATED" } };
  }
  const gate = await authorize({
    userId: input.userId,
    action: "telemetry:write",
    ports: input.ports,
  });
  if (!gate.allowed) {
    return { status: entitlementHttpStatus(gate), body: { error: "FORBIDDEN" } };
  }
  return ingest(input.ports, req, input.userId, false);
}

async function ingest(
  ports: TelemetryPorts,
  req: TelemetryRequest,
  userId: string | null,
  isService: boolean,
): Promise<{ status: number; body: unknown }> {
  const requestId =
    req.op === "fn_latency" ? req.request_id : (req.request_id ?? crypto.randomUUID());
  const sampled = shouldSampleTelemetry(requestId, ports.sampleRate());
  if (!sampled) {
    return {
      status: 200,
      body: telemetryIngestResponseSchema.parse({ stored: false, sampled: false }),
    };
  }
  const kind = telemetryKindSchema.parse(
    req.op === "fn_latency"
      ? "fn_latency"
      : req.op === "client_error"
        ? "client_error"
        : "realtime",
  );
  const row = {
    kind,
    fn: req.op === "fn_latency" ? req.fn : null,
    panel_id: req.op === "client_error" ? req.panel_id : null,
    request_id: requestId,
    user_id: req.op === "fn_latency" ? (req.user_id ?? null) : userId,
    latency_ms: req.op === "fn_latency" ? req.latency_ms : null,
    outcome: req.op === "fn_latency" ? req.outcome : req.op === "realtime" ? req.state : "error",
    payload:
      req.op === "client_error"
        ? { message: req.message, stack: req.stack ?? null }
        : req.op === "realtime"
          ? { state: req.state, attempt: req.attempt ?? null }
          : { status: req.status ?? null },
  };
  await ports.insertTelemetry(row);
  if (!isService) {
    await ports.writeAuditLog({
      user_id: userId,
      action: `telemetry:${req.op}`,
      entity_type: "telemetry",
      payload: { kind, panel_id: row.panel_id, fn: row.fn },
    });
  }
  return {
    status: 200,
    body: telemetryIngestResponseSchema.parse({ stored: true, sampled: true }),
  };
}

export type HealthPorts = AuthorizePorts & {
  now: () => Date;
  listTelemetry: () => Promise<TelemetryRecord[]>;
  getFeedHeartbeat: () => Promise<{
    ts: string | null;
    session: string | null;
    ticks_applied: number | null;
  }>;
};

export async function handleHealthServiceRequest(input: {
  method: string;
  body: unknown;
  userId: string | null;
  ports: HealthPorts;
}): Promise<{ status: number; body: unknown }> {
  if (input.method !== "POST") {
    return { status: 405, body: { error: "METHOD_NOT_ALLOWED" } };
  }
  if (!input.userId) {
    return { status: 401, body: { error: "UNAUTHENTICATED" } };
  }
  const gate = await authorize({
    userId: input.userId,
    action: "health:read",
    ports: input.ports,
  });
  if (!gate.allowed) {
    return { status: entitlementHttpStatus(gate), body: { error: "FORBIDDEN" } };
  }
  const now = input.ports.now();
  const rows = await input.ports.listTelemetry();
  const byFn = new Map<string, number[]>();
  const realtimeCounts = { live: 0, reconnecting: 0, offline: 0, connecting: 0 };
  let lastRealtime: string | null = null;
  for (const row of rows) {
    if (row.kind === "fn_latency" && row.fn && row.latency_ms !== null) {
      const list = byFn.get(row.fn) ?? [];
      list.push(Number(row.latency_ms));
      byFn.set(row.fn, list);
    }
    if (row.kind === "realtime" && row.outcome) {
      if (row.outcome === "live") realtimeCounts.live += 1;
      else if (row.outcome === "reconnecting") realtimeCounts.reconnecting += 1;
      else if (row.outcome === "offline") realtimeCounts.offline += 1;
      else if (row.outcome === "connecting") realtimeCounts.connecting += 1;
      if (!lastRealtime || row.created_at > lastRealtime) {
        lastRealtime = row.created_at;
      }
    }
  }
  const functions = [...byFn.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fn, values]) => ({
      fn,
      count: values.length,
      p50_ms: percentileNearestRank(values, 50),
      p95_ms: percentileNearestRank(values, 95),
      p99_ms: percentileNearestRank(values, 99),
    }));
  const feed = await input.ports.getFeedHeartbeat();
  const age_ms = feed.ts ? now.getTime() - new Date(feed.ts).getTime() : null;
  const snapshot: HealthSnapshot = healthSnapshotSchema.parse({
    generated_at: now.toISOString(),
    functions,
    feed: { ...feed, age_ms },
    realtime: { ...realtimeCounts, last_ts: lastRealtime },
  });
  return { status: 200, body: snapshot };
}
