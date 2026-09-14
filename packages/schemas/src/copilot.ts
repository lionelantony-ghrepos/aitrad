import { z } from "zod";
import { chartRangeSchema } from "./chart";
import { newsSearchRequestSchema } from "./news-search";
import { equityCurveRangeSchema } from "./analytics";
import { screenerCriteriaSchema, screenerSortSchema } from "./screener";
import { alertKindSchema } from "./alerts";
import { orderSideSchema, orderTypeSchema, tifSchema } from "./orders";
import { numericSchema, timestamptzSchema, uuidSchema } from "./primitives";

/** Agent-loop DoS guard (PBI-025). Not a decision-table threshold. */
export const COPILOT_MAX_TOOL_CALLS = 8;

export const COPILOT_SYSTEM_PROMPT = `You are Meridian Copilot, a market analyst inside a trading terminal. Rules:
- Never state a price, P&L, or metric you did not just retrieve via a tool. No memory prices.
- Cite sources: attach news ids / data refs for every factual claim.
- You may propose actions via tools; orders always require user approval — say so.
- You are not a licensed financial advisor: frame outputs as information/analysis, not advice;
  note material risks when discussing positions.
- Be terse and terminal-like: dense, factual, no filler.
- If a rule (e.g. risk limit) blocked something, explain it using explain_rule_decision, never
  speculate about why.`;

export const copilotReadToolNameSchema = z.enum([
  "get_quote",
  "get_bars",
  "search_news",
  "get_fundamentals",
  "screen_instruments",
  "get_portfolio",
  "explain_rule_decision",
]);

export type CopilotReadToolName = z.infer<typeof copilotReadToolNameSchema>;

export const copilotWriteToolNameSchema = z.enum([
  "create_watchlist_item",
  "create_alert",
  "propose_order",
  "create_monitor",
]);

export type CopilotWriteToolName = z.infer<typeof copilotWriteToolNameSchema>;

export const copilotToolNameSchema = z.union([
  copilotReadToolNameSchema,
  copilotWriteToolNameSchema,
]);

export type CopilotToolName = z.infer<typeof copilotToolNameSchema>;

export const createWatchlistItemToolInputSchema = z.object({
  symbol: z.string().trim().min(1).max(16),
  watchlist_id: uuidSchema.optional(),
});

export const createAlertToolInputSchema = z.object({
  symbol: z.string().trim().min(1).max(16),
  kind: alertKindSchema,
  threshold: numericSchema.optional(),
  name: z.string().trim().min(1).optional(),
});

export const proposeOrderToolInputSchema = z.object({
  symbol: z.string().trim().min(1).max(16),
  side: orderSideSchema,
  qty: z.number().positive().finite(),
  order_type: orderTypeSchema.default("market"),
  limit_price: z.number().finite().nullable().optional(),
  stop_price: z.number().finite().nullable().optional(),
  tif: tifSchema.default("DAY"),
  last_price: numericSchema.optional(),
});

export const createMonitorToolInputSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  nl_instruction: z.string().trim().min(1).max(2000),
  symbols: z.array(z.string().trim().min(1).max(16)).optional(),
});

export const copilotActionStatusSchema = z.enum([
  "proposed",
  "auto_approved",
  "approved",
  "rejected",
  "executed",
  "failed",
]);

export type CopilotActionStatus = z.infer<typeof copilotActionStatusSchema>;

export const copilotActionSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  session_id: uuidSchema,
  tool: copilotWriteToolNameSchema,
  payload: z.record(z.unknown()),
  policy_outcome: z.unknown(),
  status: copilotActionStatusSchema,
  executed_ref: z.string().nullable(),
  reject_reason: z.string().nullable(),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});

export type CopilotAction = z.infer<typeof copilotActionSchema>;

export const copilotActionDecisionSchema = z.enum(["approve", "reject"]);

export const copilotActionDecideRequestSchema = z.object({
  action_id: uuidSchema,
  decision: copilotActionDecisionSchema,
  feedback: z.string().trim().max(2000).optional(),
});

export type CopilotActionDecideRequest = z.infer<typeof copilotActionDecideRequestSchema>;

/** POST /functions/copilot-orchestrator/decide — admin writes, user JWT auth. */
export const copilotOrchestratorDecideRequestSchema = copilotActionDecideRequestSchema.extend({
  op: z.literal("decide"),
});

export type CopilotOrchestratorDecideRequest = z.infer<
  typeof copilotOrchestratorDecideRequestSchema
>;

export const copilotOrchestratorDecideResponseSchema = z.object({
  action: copilotActionSchema,
});

export type CopilotOrchestratorDecideResponse = z.infer<
  typeof copilotOrchestratorDecideResponseSchema
>;

export const writeToolResultSchema = z.object({
  status: z.enum([
    "awaiting_approval",
    "auto_approved",
    "executed",
    "blocked",
    "failed",
    "rate_limited",
  ]),
  message: z.string(),
  action: copilotActionSchema.optional(),
  executed_ref: z.string().optional(),
  reject_reason: z.string().optional(),
});

export type WriteToolResult = z.infer<typeof writeToolResultSchema>;

export const getQuoteToolInputSchema = z.object({
  symbol: z.string().trim().min(1).max(16),
});

export const getBarsToolInputSchema = z.object({
  symbol: z.string().trim().min(1).max(16),
  range: chartRangeSchema.default("1M"),
});

export const searchNewsToolInputSchema = newsSearchRequestSchema;

export const getFundamentalsToolInputSchema = z.object({
  symbol: z.string().trim().min(1).max(16),
});

export const screenInstrumentsToolInputSchema = z.object({
  sector: z.string().trim().min(1).optional(),
  criteria: screenerCriteriaSchema.optional(),
  sort: screenerSortSchema.optional(),
});

export const getPortfolioToolInputSchema = z.object({
  range: equityCurveRangeSchema.optional(),
});

export const explainRuleDecisionToolInputSchema = z.object({
  audit_id: z.string().min(1),
});

export const copilotMessageRoleSchema = z.enum(["system", "user", "assistant", "tool"]);

export type CopilotMessageRole = z.infer<typeof copilotMessageRoleSchema>;

export const copilotToolCallRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  arguments: z.unknown(),
  result: z.unknown().optional(),
  error: z.string().optional(),
});

export type CopilotToolCallRecord = z.infer<typeof copilotToolCallRecordSchema>;

export const copilotSessionSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  title: z.string().min(1),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});

export type CopilotSession = z.infer<typeof copilotSessionSchema>;

export const copilotMessageSchema = z.object({
  id: uuidSchema,
  session_id: uuidSchema,
  user_id: uuidSchema,
  role: copilotMessageRoleSchema,
  content: z.string(),
  tool_calls: z.array(copilotToolCallRecordSchema),
  created_at: timestamptzSchema,
});

export type CopilotMessage = z.infer<typeof copilotMessageSchema>;

export const copilotCitationSchema = z.object({
  kind: z.enum(["news", "des"]),
  id: z.string().min(1),
  label: z.string().min(1),
  headline: z.string().optional(),
  symbol: z.string().optional(),
});

export type CopilotCitation = z.infer<typeof copilotCitationSchema>;

export const copilotChatRequestSchema = z.object({
  session_id: uuidSchema.optional(),
  message: z.string().trim().min(1).max(4000),
  active_symbol: z.string().trim().min(1).max(16).optional(),
});

export type CopilotChatRequest = z.infer<typeof copilotChatRequestSchema>;

export const copilotChatEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("session"), session_id: uuidSchema }),
  z.object({
    type: z.literal("tool_start"),
    name: z.string().min(1),
    label: z.string().min(1),
    call_id: z.string().min(1),
  }),
  z.object({
    type: z.literal("tool_end"),
    name: z.string().min(1),
    call_id: z.string().min(1),
    ok: z.boolean(),
  }),
  z.object({ type: z.literal("token"), text: z.string() }),
  z.object({
    type: z.literal("message"),
    role: z.literal("assistant"),
    content: z.string(),
    citations: z.array(copilotCitationSchema),
  }),
  z.object({ type: z.literal("rate_limited"), message: z.string().min(1) }),
  z.object({ type: z.literal("error"), message: z.string().min(1) }),
  z.object({ type: z.literal("action"), action: copilotActionSchema }),
]);

export type CopilotChatEvent = z.infer<typeof copilotChatEventSchema>;

export const copilotSessionsResponseSchema = z.object({
  sessions: z.array(copilotSessionSchema),
});

export type CopilotSessionsResponse = z.infer<typeof copilotSessionsResponseSchema>;

export const copilotSessionDetailSchema = z.object({
  session: copilotSessionSchema,
  messages: z.array(copilotMessageSchema),
});

export type CopilotSessionDetail = z.infer<typeof copilotSessionDetailSchema>;
