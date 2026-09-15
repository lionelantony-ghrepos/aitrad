import {
  FEED_STALE_AFTER_MS,
  REALTIME_BACKOFF_INITIAL_MS,
  REALTIME_BACKOFF_MAX_MS,
  functionLogSchema,
  type FunctionLog,
  type RealtimeConnectionState,
} from "@meridian/schemas";

export function requestIdFromHeaders(headers: { get: (name: string) => string | null }): string {
  return headers.get("x-request-id") ?? headers.get("x-correlation-id") ?? crypto.randomUUID();
}

export function userIdFromAuthorization(header: string | null): string | null {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice(7);
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  try {
    const json = decodeJwtSegment(parts[1] ?? "");
    const payload = JSON.parse(json) as { sub?: unknown };
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

function decodeJwtSegment(segment: string): string {
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  if (typeof atob === "function") {
    return atob(b64 + pad);
  }
  return Buffer.from(b64 + pad, "base64").toString("utf8");
}

export function buildFunctionLog(input: FunctionLog): FunctionLog {
  return functionLogSchema.parse(input);
}

export function formatFunctionLog(input: FunctionLog): string {
  return JSON.stringify(buildFunctionLog(input));
}

/** Deterministic sample: same request_id always yields the same keep/drop for a given rate. */
export function shouldSampleTelemetry(requestId: string, rate: number): boolean {
  if (rate >= 1) {
    return true;
  }
  if (rate <= 0) {
    return false;
  }
  let hash = 0;
  for (let i = 0; i < requestId.length; i += 1) {
    hash = (hash * 31 + requestId.charCodeAt(i)) >>> 0;
  }
  return hash / 0xffffffff < rate;
}

export function parseTelemetrySampleRate(raw: string | undefined, fallback = 1): number {
  if (raw === undefined || raw.length === 0) {
    return fallback;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, n));
}

export function percentileNearestRank(values: readonly number[], p: number): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  const index = Math.min(sorted.length - 1, Math.max(0, rank));
  return sorted[index] ?? null;
}

export function isFeedStale(input: {
  lastTickMs: number | null;
  nowMs: number;
  session: "OPEN" | "CLOSED" | string;
  staleAfterMs?: number;
}): boolean {
  if (input.session !== "OPEN") {
    return false;
  }
  if (input.lastTickMs === null) {
    return true;
  }
  const limit = input.staleAfterMs ?? FEED_STALE_AFTER_MS;
  return input.nowMs - input.lastTickMs > limit;
}

export function nextRealtimeBackoffMs(
  attempt: number,
  initialMs = REALTIME_BACKOFF_INITIAL_MS,
  maxMs = REALTIME_BACKOFF_MAX_MS,
): number {
  const exp = Math.max(0, attempt);
  return Math.min(maxMs, initialMs * 2 ** exp);
}

export function nextRealtimeState(input: {
  current: RealtimeConnectionState;
  event: "start" | "open" | "close" | "give_up";
}): RealtimeConnectionState {
  if (input.event === "start") {
    return input.current === "live" || input.current === "offline" ? "connecting" : "reconnecting";
  }
  if (input.event === "open") {
    return "live";
  }
  if (input.event === "give_up") {
    return "offline";
  }
  return "reconnecting";
}
