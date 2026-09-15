import { z } from "zod";

/**
 * Architecture §8 / PBI-030 engineering budgets. These are latency/render SLOs,
 * not decision-table business policy.
 */
export const ARCHITECTURE_REST_P95_MS = 300;
export const ARCHITECTURE_WORKSPACE_TTI_MS = 3000;
export const ARCHITECTURE_PREVIEW_LOAD_RPS = 50;
/** PBI-030: STALE watermark when last tick is older than this while the session is OPEN. */
export const FEED_STALE_AFTER_MS = 10_000;
export const REALTIME_BACKOFF_INITIAL_MS = 250;
export const REALTIME_BACKOFF_MAX_MS = 8_000;

export const functionLogOutcomeSchema = z.enum(["ok", "error", "throw"]);

export const functionLogSchema = z.object({
  request_id: z.string().min(1),
  user_id: z.string().nullable(),
  fn: z.string().min(1),
  latency_ms: z.number().nonnegative(),
  outcome: functionLogOutcomeSchema,
  status: z.number().int().optional(),
});

export type FunctionLog = z.infer<typeof functionLogSchema>;

export const realtimeConnectionStateSchema = z.enum([
  "connecting",
  "live",
  "reconnecting",
  "offline",
]);

export type RealtimeConnectionState = z.infer<typeof realtimeConnectionStateSchema>;
