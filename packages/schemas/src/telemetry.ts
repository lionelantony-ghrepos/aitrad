import { z } from "zod";
import { numericSchema, timestamptzSchema, uuidSchema } from "./primitives";
import { functionLogOutcomeSchema, realtimeConnectionStateSchema } from "./observability";

export const telemetryKindSchema = z.enum(["fn_latency", "client_error", "realtime"]);

export type TelemetryKind = z.infer<typeof telemetryKindSchema>;

export const telemetryRecordSchema = z.object({
  id: uuidSchema,
  kind: telemetryKindSchema,
  fn: z.string().nullable(),
  panel_id: z.string().nullable(),
  request_id: z.string().nullable(),
  user_id: uuidSchema.nullable(),
  latency_ms: numericSchema.nullable(),
  outcome: z.string().nullable(),
  payload: z.record(z.unknown()),
  created_at: timestamptzSchema,
});

export type TelemetryRecord = z.infer<typeof telemetryRecordSchema>;

export const telemetryClientErrorRequestSchema = z.object({
  op: z.literal("client_error"),
  panel_id: z.string().min(1),
  message: z.string().min(1).max(2000),
  stack: z.string().max(8000).optional(),
  request_id: z.string().min(1).optional(),
});

export const telemetryRealtimeRequestSchema = z.object({
  op: z.literal("realtime"),
  state: realtimeConnectionStateSchema,
  attempt: z.number().int().nonnegative().optional(),
  request_id: z.string().min(1).optional(),
});

export const telemetryFnLatencyRequestSchema = z.object({
  op: z.literal("fn_latency"),
  fn: z.string().min(1),
  request_id: z.string().min(1),
  user_id: uuidSchema.nullable().optional(),
  latency_ms: z.number().nonnegative(),
  outcome: functionLogOutcomeSchema,
  status: z.number().int().optional(),
});

export const telemetryRequestSchema = z.discriminatedUnion("op", [
  telemetryClientErrorRequestSchema,
  telemetryRealtimeRequestSchema,
  telemetryFnLatencyRequestSchema,
]);

export type TelemetryRequest = z.infer<typeof telemetryRequestSchema>;

export const telemetryIngestResponseSchema = z.object({
  stored: z.boolean(),
  sampled: z.boolean(),
});

export type TelemetryIngestResponse = z.infer<typeof telemetryIngestResponseSchema>;

export const latencyPercentilesSchema = z.object({
  fn: z.string(),
  count: z.number().int().nonnegative(),
  p50_ms: z.number().nullable(),
  p95_ms: z.number().nullable(),
  p99_ms: z.number().nullable(),
});

export const feedHeartbeatSchema = z.object({
  ts: timestamptzSchema.nullable(),
  session: z.string().nullable(),
  ticks_applied: z.number().nullable(),
  age_ms: z.number().nullable(),
});

export const realtimeChannelStatsSchema = z.object({
  live: z.number().int().nonnegative(),
  reconnecting: z.number().int().nonnegative(),
  offline: z.number().int().nonnegative(),
  connecting: z.number().int().nonnegative(),
  last_ts: timestamptzSchema.nullable(),
});

export const healthSnapshotSchema = z.object({
  generated_at: timestamptzSchema,
  functions: z.array(latencyPercentilesSchema),
  feed: feedHeartbeatSchema,
  realtime: realtimeChannelStatsSchema,
});

export type HealthSnapshot = z.infer<typeof healthSnapshotSchema>;

export const healthServiceRequestSchema = z.object({
  op: z.literal("snapshot"),
});

export type HealthServiceRequest = z.infer<typeof healthServiceRequestSchema>;
