import { z } from "zod";
import { numericSchema, timestamptzSchema, uuidSchema } from "./primitives";

export const experienceLevelSchema = z.enum(["novice", "intermediate", "advanced"]);

export const suitabilityTierSchema = z.enum(["conservative", "standard", "full"]);

export const profileSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  display_name: z.string().nullable(),
  persona: z.string().nullable(),
  experience_level: experienceLevelSchema.nullable(),
  suitability_tier: suitabilityTierSchema.nullable(),
  objectives: z.string().nullable(),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});

export const profileInsertSchema = z.object({
  user_id: uuidSchema,
  display_name: z.string().nullable().optional(),
  persona: z.string().nullable().optional(),
  experience_level: experienceLevelSchema.nullable().optional(),
  suitability_tier: suitabilityTierSchema.nullable().optional(),
  objectives: z.string().nullable().optional(),
});

export const profilePatchSchema = profileInsertSchema.omit({ user_id: true }).partial();

export type Profile = z.infer<typeof profileSchema>;
export type ProfileInsert = z.infer<typeof profileInsertSchema>;
export type ProfilePatch = z.infer<typeof profilePatchSchema>;

export const accountSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  cash_balance: numericSchema,
  currency: z.string().min(1),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});

export const accountInsertSchema = z.object({
  user_id: uuidSchema,
  cash_balance: numericSchema.optional(),
  currency: z.string().min(1).optional(),
});

export const accountPatchSchema = z.object({
  cash_balance: numericSchema.optional(),
  currency: z.string().min(1).optional(),
});

export type Account = z.infer<typeof accountSchema>;
export type AccountInsert = z.infer<typeof accountInsertSchema>;
export type AccountPatch = z.infer<typeof accountPatchSchema>;

export const instrumentStatusSchema = z.enum(["active", "halted", "delisted"]);

export const marketCapBandSchema = z.enum(["mega", "large", "mid", "small", "micro"]);

export const betaClassSchema = z.enum(["low", "medium", "high"]);

export const avgVolumeBandSchema = z.enum(["low", "medium", "high"]);

export const barTimeframeSchema = z.enum(["1m", "1d"]);

export type MarketCapBand = z.infer<typeof marketCapBandSchema>;
export type BetaClass = z.infer<typeof betaClassSchema>;
export type AvgVolumeBand = z.infer<typeof avgVolumeBandSchema>;
export type BarTimeframe = z.infer<typeof barTimeframeSchema>;

/** Static universe row from `mock_data/instruments.json` (doc 06). */
export const mockInstrumentSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  exchange: z.string().min(1),
  sector: z.string().min(1),
  industry: z.string().min(1),
  status: instrumentStatusSchema,
  currency: z.string().min(1),
  tick_size: numericSchema,
  lot_size: z.coerce.number().int().positive(),
  base_price: numericSchema,
  market_cap_band: marketCapBandSchema,
  beta_class: betaClassSchema,
  avg_volume: z.coerce.number().positive(),
  avg_volume_band: avgVolumeBandSchema,
});

export type MockInstrument = z.infer<typeof mockInstrumentSchema>;

export const instrumentSchema = z.object({
  id: uuidSchema,
  symbol: z.string().min(1),
  name: z.string().min(1),
  exchange: z.string().min(1),
  sector: z.string().nullable(),
  industry: z.string().nullable(),
  status: instrumentStatusSchema,
  currency: z.string().min(1),
  tick_size: numericSchema,
  lot_size: z.coerce.number().int(),
  market_cap_band: marketCapBandSchema.nullable().optional(),
  beta_class: betaClassSchema.nullable().optional(),
  avg_volume: numericSchema.nullable().optional(),
  avg_volume_band: avgVolumeBandSchema.nullable().optional(),
  base_price: numericSchema.nullable().optional(),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});

export type Instrument = z.infer<typeof instrumentSchema>;

export const instrumentUpsertSchema = mockInstrumentSchema;

export const marketBarSchema = z.object({
  instrument_id: uuidSchema,
  timeframe: barTimeframeSchema,
  ts: timestamptzSchema,
  o: numericSchema,
  h: numericSchema,
  l: numericSchema,
  c: numericSchema,
  v: numericSchema,
});

export type MarketBar = z.infer<typeof marketBarSchema>;

export const quotesLatestSchema = z.object({
  instrument_id: uuidSchema,
  bid: numericSchema,
  ask: numericSchema,
  last: numericSchema,
  prev_close: numericSchema,
  volume: numericSchema,
  ts: timestamptzSchema,
});

export type QuotesLatest = z.infer<typeof quotesLatestSchema>;

export const sessionKindSchema = z.enum(["regular", "half"]);

export const marketCalendarRowSchema = z.object({
  session_date: z
    .string()
    .min(10)
    .transform((value) => value.slice(0, 10))
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), "session_date"),
  venue: z.string().min(1),
  session_kind: sessionKindSchema,
  open_minute: z.coerce.number().int().nonnegative(),
  close_minute: z.coerce.number().int().positive(),
});

export type MarketCalendarRowDto = z.infer<typeof marketCalendarRowSchema>;

export const feedForcePriceSchema = z.object({
  symbol: z.string().min(1),
  price: numericSchema,
});

export const feedControlsValueSchema = z.object({
  paused: z.boolean().optional(),
  speed: numericSchema.optional(),
});

export const quoteTickSchema = z.object({
  instrument_id: uuidSchema,
  symbol: z.string().min(1).optional(),
  bid: numericSchema,
  ask: numericSchema,
  last: numericSchema,
  prev_close: numericSchema,
  volume: numericSchema,
  ts: timestamptzSchema,
});

export const quoteTickBatchSchema = z.object({
  ts: timestamptzSchema,
  ticks: z.array(quoteTickSchema),
});

export type QuoteTickBatch = z.infer<typeof quoteTickBatchSchema>;

export const auditLogSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema.nullable(),
  action: z.string().min(1),
  entity_type: z.string().min(1),
  entity_id: uuidSchema.nullable(),
  payload: z.record(z.unknown()),
  created_at: timestamptzSchema,
});

export const auditLogInsertSchema = z.object({
  user_id: uuidSchema,
  action: z.string().min(1),
  entity_type: z.string().min(1),
  entity_id: uuidSchema.nullable().optional(),
  payload: z.record(z.unknown()).optional(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;
export type AuditLogInsert = z.infer<typeof auditLogInsertSchema>;

export const featureFlagSchema = z.object({
  id: uuidSchema,
  key: z.string().min(1),
  value: z.unknown(),
  user_id: uuidSchema.nullable(),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});

export const featureFlagInsertSchema = z.object({
  key: z.string().min(1),
  value: z.unknown().optional(),
  user_id: uuidSchema.nullable().optional(),
});

export type FeatureFlag = z.infer<typeof featureFlagSchema>;
export type FeatureFlagInsert = z.infer<typeof featureFlagInsertSchema>;
