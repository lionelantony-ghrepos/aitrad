import { z } from "zod";
import { decisionConditionSchema, decisionRowSchema } from "./decision-table";
import { numericSchema, timestamptzSchema, uuidSchema } from "./primitives";
import { quoteTickSchema } from "./entities";
import { newsItemSchema } from "./news";

export const alertKindSchema = z.enum([
  "price_cross_above",
  "price_cross_below",
  "pct_chg",
  "volume",
  "rsi",
  "news_sentiment",
]);

export type AlertKind = z.infer<typeof alertKindSchema>;

export const alertThrottleStateSchema = z
  .object({
    last_fired_at: timestamptzSchema.nullable().optional(),
    fires_today: z.coerce.number().int().nonnegative().optional(),
    fires_on_date: z.string().nullable().optional(),
    last_eval_last: numericSchema.nullable().optional(),
    paused: z.boolean().optional(),
  })
  .strict();

export type AlertThrottleState = z.infer<typeof alertThrottleStateSchema>;

export const alertRuleConditionSchema = decisionRowSchema;

export const alertRuleSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  instrument_id: uuidSchema.nullable(),
  name: z.string().min(1),
  kind: alertKindSchema,
  condition: alertRuleConditionSchema,
  active: z.boolean(),
  throttle_state: alertThrottleStateSchema,
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});

export type AlertRule = z.infer<typeof alertRuleSchema>;

export const alertRuleInsertSchema = z
  .object({
    user_id: uuidSchema,
    instrument_id: uuidSchema.nullable().optional(),
    name: z.string().min(1),
    kind: alertKindSchema,
    condition: alertRuleConditionSchema,
    active: z.boolean().optional(),
    throttle_state: alertThrottleStateSchema.optional(),
  })
  .strict();

export type AlertRuleInsert = z.infer<typeof alertRuleInsertSchema>;

export const alertRulePatchSchema = z
  .object({
    name: z.string().min(1).optional(),
    active: z.boolean().optional(),
    throttle_state: alertThrottleStateSchema.optional(),
    condition: alertRuleConditionSchema.optional(),
  })
  .strict();

export type AlertRulePatch = z.infer<typeof alertRulePatchSchema>;

export const alertCreateRequestSchema = z
  .object({
    instrument_id: uuidSchema.nullable().optional(),
    symbol: z.string().min(1).optional(),
    kind: alertKindSchema,
    threshold: numericSchema.optional(),
    name: z.string().min(1).optional(),
  })
  .strict();

export type AlertCreateRequest = z.infer<typeof alertCreateRequestSchema>;

export const alertInstanceSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  alert_rule_id: uuidSchema,
  instrument_id: uuidSchema.nullable(),
  fired_at: timestamptzSchema,
  message: z.string().min(1),
  payload: z.record(z.unknown()),
  read: z.boolean(),
  created_at: timestamptzSchema,
});

export type AlertInstance = z.infer<typeof alertInstanceSchema>;

export const alertInstanceInsertSchema = z
  .object({
    user_id: uuidSchema,
    alert_rule_id: uuidSchema,
    instrument_id: uuidSchema.nullable().optional(),
    fired_at: timestamptzSchema.optional(),
    message: z.string().min(1),
    payload: z.record(z.unknown()).optional(),
    read: z.boolean().optional(),
  })
  .strict();

export type AlertInstanceInsert = z.infer<typeof alertInstanceInsertSchema>;

export const alertRealtimeEventSchema = z.object({
  kind: z.literal("alert"),
  alert: alertInstanceSchema,
});

export type AlertRealtimeEvent = z.infer<typeof alertRealtimeEventSchema>;

export const alertRunnerRequestSchema = z
  .object({
    ticks: z.array(quoteTickSchema).optional(),
    news: z.array(newsItemSchema).optional(),
    clock: timestamptzSchema.optional(),
  })
  .strict();

export type AlertRunnerRequest = z.infer<typeof alertRunnerRequestSchema>;

export const alertRunnerResponseSchema = z.object({
  evaluated: z.number().int().nonnegative(),
  fired: z.number().int().nonnegative(),
  suppressed: z.number().int().nonnegative(),
});

export type AlertRunnerResponse = z.infer<typeof alertRunnerResponseSchema>;

export const evaluateAlertsRequestSchema = z
  .object({
    ticks: z.array(quoteTickSchema).optional(),
    news: z.array(newsItemSchema).optional(),
  })
  .strict();

export type EvaluateAlertsRequest = z.infer<typeof evaluateAlertsRequestSchema>;

/** Condition cells stored on alert_rules — same operators as the rules-engine. */
export const alertConditionListSchema = z.array(decisionConditionSchema).min(1);
