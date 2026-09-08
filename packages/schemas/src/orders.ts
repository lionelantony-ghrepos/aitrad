import { z } from "zod";
import { numericSchema, timestamptzSchema, uuidSchema } from "./primitives";

export const orderSideSchema = z.enum(["buy", "sell"]);

export const orderTypeSchema = z.enum(["market", "limit", "stop", "stop_limit"]);

export const tifSchema = z.enum(["DAY", "GTC", "IOC"]);

export const qtyModeSchema = z.enum(["shares", "notional"]);

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
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});

export const orderCreateResponseSchema = z.object({
  order: orderRecordSchema,
  preview: orderPreviewResponseSchema,
});

export type OrderSide = z.infer<typeof orderSideSchema>;
export type OrderType = z.infer<typeof orderTypeSchema>;
export type TimeInForce = z.infer<typeof tifSchema>;
export type QtyMode = z.infer<typeof qtyModeSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type OrderDraft = z.infer<typeof orderDraftSchema>;
export type OrderPreviewRequest = z.infer<typeof orderPreviewRequestSchema>;
export type OrderPreviewRule = z.infer<typeof orderPreviewRuleSchema>;
export type OrderFeeBreakdown = z.infer<typeof orderFeeBreakdownSchema>;
export type OrderPreviewResponse = z.infer<typeof orderPreviewResponseSchema>;
export type OrderCreateRequest = z.infer<typeof orderCreateRequestSchema>;
export type OrderRecord = z.infer<typeof orderRecordSchema>;
export type OrderCreateResponse = z.infer<typeof orderCreateResponseSchema>;
