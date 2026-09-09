import { z } from "zod";
import { quoteTickSchema } from "./entities";
import { numericSchema, timestamptzSchema, uuidSchema } from "./primitives";

export const orderSideSchema = z.enum(["buy", "sell"]);

export const orderTypeSchema = z.enum(["market", "limit", "stop", "stop_limit"]);

export const tifSchema = z.enum(["DAY", "GTC", "IOC"]);

export const qtyModeSchema = z.enum(["shares", "notional"]);

export const orderGroupTypeSchema = z.enum(["bracket", "oco"]);

export const orderLegRoleSchema = z.enum(["entry", "take_profit", "stop_loss", "oco_a", "oco_b"]);

export const trailTypeSchema = z.enum(["percent", "amount"]);

export const orderStatusSchema = z.enum([
  "draft",
  "validated",
  "accepted",
  "working",
  "partially_filled",
  "filled",
  "cancelled",
  "rejected",
  "expired",
]);

/** Structural ticket draft. Policy (qty caps, required prices) is DT-VAL-01 / DT-RISK-01. */
export const orderDraftSchema = z
  .object({
    symbol: z.string().min(1),
    side: orderSideSchema,
    qty: z.number().finite(),
    order_type: orderTypeSchema,
    limit_price: z.number().finite().nullable().optional(),
    stop_price: z.number().finite().nullable().optional(),
    tif: tifSchema,
    group_type: orderGroupTypeSchema.nullable().optional(),
    tp_price: z.number().finite().nullable().optional(),
    sl_price: z.number().finite().nullable().optional(),
    trail_type: trailTypeSchema.nullable().optional(),
    trail_value: z.number().finite().nullable().optional(),
  })
  .strict();

export const orderPreviewRequestSchema = z
  .object({
    op: z.literal("preview").optional(),
    draft: orderDraftSchema,
    last_price: numericSchema,
  })
  .strict();

export const orderPreviewRuleSchema = z.object({
  table_key: z.string().min(1),
  passed: z.boolean(),
  decision: z.string().min(1),
  reason: z.string().min(1),
  reason_code: z.string().min(1).optional(),
});

export const orderFeeBreakdownSchema = z.object({
  commission_usd: numericSchema,
  sec_fee: numericSchema,
  taf: numericSchema,
  data_fee_monthly: numericSchema.optional(),
});

export const orderPreviewResponseSchema = z.object({
  passed: z.boolean(),
  buying_power: numericSchema,
  last_price: numericSchema,
  qty: numericSchema,
  order_notional: numericSchema,
  estimated_fees: numericSchema,
  est_total: numericSchema,
  fees: orderFeeBreakdownSchema,
  rules: z.array(orderPreviewRuleSchema),
  validation_outcome: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]),
  risk_outcome: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]),
  fee_outcome: z.record(z.unknown()),
  hours_outcome: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]).default({}),
});

export const orderCreateRequestSchema = z
  .object({
    op: z.literal("create").optional(),
    draft: orderDraftSchema,
    last_price: numericSchema,
  })
  .strict();

export const orderRecordSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  account_id: uuidSchema,
  instrument_id: uuidSchema,
  symbol: z.string().min(1),
  side: orderSideSchema,
  qty: numericSchema,
  filled_qty: numericSchema,
  order_type: orderTypeSchema,
  limit_price: numericSchema.nullable(),
  stop_price: numericSchema.nullable(),
  tif: tifSchema,
  status: orderStatusSchema,
  reject_reason: z.string().nullable(),
  rule_audit_id: z.string().nullable(),
  parent_order_id: uuidSchema.nullable().optional(),
  group_id: uuidSchema.nullable().optional(),
  group_type: orderGroupTypeSchema.nullable().optional(),
  leg_role: orderLegRoleSchema.nullable().optional(),
  group_activated: z.boolean().optional(),
  trail_type: trailTypeSchema.nullable().optional(),
  trail_value: numericSchema.nullable().optional(),
  high_water_mark: numericSchema.nullable().optional(),
  reserved_amount: numericSchema.optional(),
  stop_triggered: z.boolean().optional(),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});

export const orderCreateResponseSchema = z.object({
  order: orderRecordSchema,
  preview: orderPreviewResponseSchema,
});

export const orderCancelRequestSchema = z
  .object({
    op: z.literal("cancel").optional(),
    order_id: uuidSchema.optional(),
  })
  .strict();

export const orderCancelResponseSchema = z.object({
  order: orderRecordSchema,
});

/** Realtime `orders:{userId}` event `order` payload (publish_order_event). */
export const orderRealtimeEventSchema = z.object({
  id: uuidSchema,
  status: orderStatusSchema.optional(),
  symbol: z.string().min(1).optional(),
  reject_reason: z.string().nullable().optional(),
  rule_audit_id: z.string().nullable().optional(),
});

export const blotterTabSchema = z.enum(["working", "filled", "rejected", "all"]);

export const blotterSideFilterSchema = z.enum(["all", "buy", "sell"]);

export const blotterFiltersSchema = z
  .object({
    symbol: z.string(),
    side: blotterSideFilterSchema,
    status: z.union([z.literal("all"), orderStatusSchema]),
    dateFrom: z.string(),
    dateTo: z.string(),
  })
  .strict();

export const executionRecordSchema = z.object({
  id: uuidSchema,
  order_id: uuidSchema,
  user_id: uuidSchema,
  account_id: uuidSchema,
  instrument_id: uuidSchema,
  symbol: z.string().min(1),
  side: orderSideSchema,
  qty: numericSchema,
  price: numericSchema,
  created_at: timestamptzSchema,
});

export const positionRecordSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  account_id: uuidSchema,
  instrument_id: uuidSchema,
  symbol: z.string().min(1),
  qty: numericSchema,
  avg_cost: numericSchema,
  realized_pnl: numericSchema,
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});

export const portfolioSnapshotSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  account_id: uuidSchema,
  as_of_date: z.string().min(1),
  equity: numericSchema,
  cash: numericSchema,
  buying_power: numericSchema,
  created_at: timestamptzSchema,
});

/** Resolved DT-EXEC-01 outputs for one match() call. Thresholds stay in the table. */
export const execConfigSchema = z.object({
  slippage_bps: numericSchema,
  liquidity_cap: numericSchema.optional(),
  liquidity_cap_pct_adv: numericSchema.optional(),
  tick_size: numericSchema.optional(),
});

export const matchTickSchema = z.object({
  instrument_id: uuidSchema.optional(),
  symbol: z.string().min(1).optional(),
  last: numericSchema,
  bid: numericSchema.optional(),
  ask: numericSchema.optional(),
  ts: timestamptzSchema.optional(),
});

export const workingOrderMatchSchema = z.object({
  id: z.string().min(1),
  side: orderSideSchema,
  qty: numericSchema,
  filled_qty: numericSchema,
  order_type: orderTypeSchema,
  limit_price: numericSchema.nullable().optional(),
  stop_price: numericSchema.nullable().optional(),
  stop_triggered: z.boolean().optional(),
  tif: tifSchema.optional(),
  created_at: timestamptzSchema.optional(),
  group_id: z.string().min(1).nullable().optional(),
  group_type: orderGroupTypeSchema.nullable().optional(),
  leg_role: orderLegRoleSchema.nullable().optional(),
  group_activated: z.boolean().optional(),
  trail_type: trailTypeSchema.nullable().optional(),
  trail_value: numericSchema.nullable().optional(),
  high_water_mark: numericSchema.nullable().optional(),
});

export const matchFillSchema = z.object({
  order_id: z.string().min(1),
  side: orderSideSchema,
  qty: numericSchema,
  price: numericSchema,
});

export const matchingRunnerRequestSchema = z
  .object({
    ticks: z.array(quoteTickSchema).optional(),
  })
  .strict();

export const matchingRunnerResponseSchema = z.object({
  ticks: z.number().int().nonnegative(),
  promoted: z.number().int().nonnegative(),
  fills: z.number().int().nonnegative(),
  triggered: z.number().int().nonnegative(),
});

export type OrderSide = z.infer<typeof orderSideSchema>;
export type OrderType = z.infer<typeof orderTypeSchema>;
export type TimeInForce = z.infer<typeof tifSchema>;
export type QtyMode = z.infer<typeof qtyModeSchema>;
export type OrderGroupType = z.infer<typeof orderGroupTypeSchema>;
export type OrderLegRole = z.infer<typeof orderLegRoleSchema>;
export type TrailType = z.infer<typeof trailTypeSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type OrderDraft = z.infer<typeof orderDraftSchema>;
export type OrderPreviewRequest = z.infer<typeof orderPreviewRequestSchema>;
export type OrderPreviewRule = z.infer<typeof orderPreviewRuleSchema>;
export type OrderFeeBreakdown = z.infer<typeof orderFeeBreakdownSchema>;
export type OrderPreviewResponse = z.infer<typeof orderPreviewResponseSchema>;
export type OrderCreateRequest = z.infer<typeof orderCreateRequestSchema>;
export type OrderRecord = z.infer<typeof orderRecordSchema>;
export type OrderCreateResponse = z.infer<typeof orderCreateResponseSchema>;
export type OrderCancelRequest = z.infer<typeof orderCancelRequestSchema>;
export type OrderCancelResponse = z.infer<typeof orderCancelResponseSchema>;
export type OrderRealtimeEvent = z.infer<typeof orderRealtimeEventSchema>;
export type BlotterTab = z.infer<typeof blotterTabSchema>;
export type BlotterSideFilter = z.infer<typeof blotterSideFilterSchema>;
export type BlotterFilters = z.infer<typeof blotterFiltersSchema>;
export type ExecutionRecord = z.infer<typeof executionRecordSchema>;
export type PositionRecord = z.infer<typeof positionRecordSchema>;
export type PortfolioSnapshot = z.infer<typeof portfolioSnapshotSchema>;
export type ExecConfig = z.infer<typeof execConfigSchema>;
export type MatchTick = z.infer<typeof matchTickSchema>;
export type WorkingOrderMatch = z.infer<typeof workingOrderMatchSchema>;
export type MatchFill = z.infer<typeof matchFillSchema>;
export type MatchingRunnerRequest = z.infer<typeof matchingRunnerRequestSchema>;
export type MatchingRunnerResponse = z.infer<typeof matchingRunnerResponseSchema>;
