import { z } from "zod";
import { decisionRowSchema } from "./decision-table";
import { uuidSchema } from "./primitives";

export const ruleDomainSchema = z.enum([
  "order_validation",
  "pre_trade_risk",
  "market_hours",
  "execution_sim",
  "fees",
  "suitability",
  "entitlements",
  "ai_action_policy",
  "alerting",
  "portfolio_analysis",
  "market_sim",
]);

export const tableStatusSchema = z.enum(["draft", "published", "retired"]);

export const tableVersionRefSchema = z.object({
  table_key: z.string().min(1),
  version: z.number().int().positive(),
});

export const evaluateDomainRequestSchema = z.object({
  op: z.literal("evaluateDomain").optional(),
  domain: ruleDomainSchema,
  context: z.record(z.unknown()),
  clock: z.string().optional(),
  userId: uuidSchema.optional(),
});

export const evaluateDomainResponseSchema = z.object({
  outcome: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]),
  matchedRows: z.array(decisionRowSchema),
  trace: z.array(z.unknown()),
  auditId: z.string().min(1),
  tableVersions: z.array(tableVersionRefSchema),
});

export const ruleAuditInsertSchema = z.object({
  user_id: uuidSchema.nullable().optional(),
  domain: ruleDomainSchema,
  table_versions: z.array(tableVersionRefSchema),
  context: z.record(z.unknown()),
  matched_rows: z.unknown(),
  outcome: z.unknown(),
  latency_ms: z.number().int().nonnegative(),
});

export const publishRulesRequestSchema = z.object({
  op: z.literal("publish"),
  tableKey: z.string().min(1),
});

export const invalidateRulesRequestSchema = z.object({
  op: z.literal("invalidate"),
  event: z.literal("rules:published").optional(),
});

export type RuleDomain = z.infer<typeof ruleDomainSchema>;
export type TableStatus = z.infer<typeof tableStatusSchema>;
export type TableVersionRef = z.infer<typeof tableVersionRefSchema>;
export type EvaluateDomainRequest = z.infer<typeof evaluateDomainRequestSchema>;
export type EvaluateDomainResponse = z.infer<typeof evaluateDomainResponseSchema>;
export type RuleAuditInsert = z.infer<typeof ruleAuditInsertSchema>;
