import { z } from "zod";
import { alertThrottleStateSchema } from "./alerts";
import { decisionConditionSchema, decisionRowSchema } from "./decision-table";
import { timestamptzSchema, uuidSchema } from "./primitives";

export const MONITOR_FACT_INPUTS = [
  "position_day_pct",
  "portfolio_day_pct",
  "pct_chg",
  "last",
  "volume",
  "rsi_14",
  "news_sentiment",
] as const;

export const monitorFactInputSchema = z.enum(MONITOR_FACT_INPUTS);

export type MonitorFactInput = z.infer<typeof monitorFactInputSchema>;

export const monitorCadenceSchema = z.enum(["5m", "15m", "1h", "1d"]);

export type MonitorCadence = z.infer<typeof monitorCadenceSchema>;

export const monitorScopeKindSchema = z.enum(["symbols", "sector", "portfolio"]);

export type MonitorScopeKind = z.infer<typeof monitorScopeKindSchema>;

export const monitorScopeSchema = z
  .object({
    kind: monitorScopeKindSchema,
    symbols: z.array(z.string().trim().min(1).max(16)).max(50).optional(),
    sector: z.string().trim().min(1).max(64).optional(),
  })
  .strict()
  .superRefine((scope, ctx) => {
    if (scope.kind === "symbols" && (!scope.symbols || scope.symbols.length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "SCOPE_SYMBOLS_REQUIRED" });
    }
    if (scope.kind === "sector" && !scope.sector) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "SCOPE_SECTOR_REQUIRED" });
    }
  });

export type MonitorScope = z.infer<typeof monitorScopeSchema>;

export const compiledMonitorConditionSchema = decisionRowSchema.superRefine((row, ctx) => {
  if (row.outputs.decision !== "fire") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "MONITOR_OUTPUT_FIRE" });
  }
  if (row.conditions.length < 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "MONITOR_CONDITION_REQUIRED" });
  }
  for (const cell of row.conditions) {
    const input = monitorFactInputSchema.safeParse(cell.input);
    if (!input.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `MONITOR_FACT_UNKNOWN:${cell.input}`,
      });
    }
  }
});

export type CompiledMonitorCondition = z.infer<typeof compiledMonitorConditionSchema>;

export const monitorCompileResultSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    cadence: monitorCadenceSchema.optional(),
    scope: monitorScopeSchema,
    compiled_condition: compiledMonitorConditionSchema,
    propose_action: z.record(z.unknown()).nullable().optional(),
  })
  .strict();

export type MonitorCompileResult = z.infer<typeof monitorCompileResultSchema>;

export const monitorSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  session_id: uuidSchema.nullable().optional(),
  name: z.string().min(1),
  nl_instruction: z.string().min(1),
  compiled_condition: compiledMonitorConditionSchema,
  scope: monitorScopeSchema,
  cadence: monitorCadenceSchema,
  last_run: timestamptzSchema.nullable(),
  active: z.boolean(),
  throttle_state: alertThrottleStateSchema,
  propose_action: z.record(z.unknown()).nullable().optional(),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});

export type Monitor = z.infer<typeof monitorSchema>;

export const monitorInsertSchema = z
  .object({
    user_id: uuidSchema,
    session_id: uuidSchema.nullable().optional(),
    name: z.string().min(1),
    nl_instruction: z.string().min(1),
    compiled_condition: compiledMonitorConditionSchema,
    scope: monitorScopeSchema,
    cadence: monitorCadenceSchema.optional(),
    last_run: timestamptzSchema.nullable().optional(),
    active: z.boolean().optional(),
    throttle_state: alertThrottleStateSchema.optional(),
    propose_action: z.record(z.unknown()).nullable().optional(),
  })
  .strict();

export type MonitorInsert = z.infer<typeof monitorInsertSchema>;

export const monitorPatchSchema = z
  .object({
    name: z.string().min(1).optional(),
    active: z.boolean().optional(),
    last_run: timestamptzSchema.nullable().optional(),
    throttle_state: alertThrottleStateSchema.optional(),
  })
  .strict();

export type MonitorPatch = z.infer<typeof monitorPatchSchema>;

export const monitorCreateRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    nl_instruction: z.string().trim().min(1).max(2000),
    symbols: z.array(z.string().trim().min(1).max(16)).optional(),
    session_id: uuidSchema.optional(),
  })
  .strict();

export type MonitorCreateRequest = z.infer<typeof monitorCreateRequestSchema>;

export const monitorRunnerRequestSchema = z
  .object({
    clock: timestamptzSchema.optional(),
    force: z.boolean().optional(),
    force_position_day_pct: z.number().optional(),
    user_id: uuidSchema.optional(),
  })
  .strict();

export type MonitorRunnerRequest = z.infer<typeof monitorRunnerRequestSchema>;

export const monitorRunnerResponseSchema = z.object({
  evaluated: z.number().int().nonnegative(),
  fired: z.number().int().nonnegative(),
  suppressed: z.number().int().nonnegative(),
});

export type MonitorRunnerResponse = z.infer<typeof monitorRunnerResponseSchema>;

/** Constrained LLM cell (same operators as the rules-engine). */
export const monitorLlmConditionCellSchema = decisionConditionSchema.extend({
  input: monitorFactInputSchema,
});
