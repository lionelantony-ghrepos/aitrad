import { z } from "zod";
import { numericSchema, timestamptzSchema, uuidSchema } from "./primitives";
import { instrumentSchema, quotesLatestSchema } from "./entities";

export const analystRatingsSchema = z.object({
  buy: z.coerce.number().int().nonnegative(),
  hold: z.coerce.number().int().nonnegative(),
  sell: z.coerce.number().int().nonnegative(),
});

export type AnalystRatings = z.infer<typeof analystRatingsSchema>;

export const fourPeriodSeriesSchema = z.object({
  labels: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  values: z.tuple([numericSchema, numericSchema, numericSchema, numericSchema]),
});

export type FourPeriodSeries = z.infer<typeof fourPeriodSeriesSchema>;

export const fundamentalsValuationSchema = z.object({
  pe: numericSchema.optional(),
  market_cap_b: numericSchema.optional(),
  shares_out_m: numericSchema.optional(),
  expense_ratio: numericSchema.optional(),
  aum_b: numericSchema.optional(),
});

export const fundamentalsIncomeSchema = z.object({
  eps_ttm: numericSchema.optional(),
  revenue_b: numericSchema.optional(),
  revenue_growth_pct: numericSchema.optional(),
  next_earnings: z.string().min(1).optional(),
  revenue_periods: fourPeriodSeriesSchema,
  eps_periods: fourPeriodSeriesSchema,
});

export const fundamentalsMarginsSchema = z.object({
  gross_margin_pct: numericSchema.optional(),
  net_margin_pct: numericSchema.optional(),
});

export const fundamentalsDividendsSchema = z.object({
  dividend_yield: numericSchema,
});

export const fundamentalsRangesSchema = z.object({
  week52_low: numericSchema,
  week52_high: numericSchema,
});

/** Nested jsonb stored on `fundamentals.metrics` (PBI-020). */
export const fundamentalsMetricsSchema = z
  .object({
    valuation: fundamentalsValuationSchema,
    income: fundamentalsIncomeSchema,
    margins: fundamentalsMarginsSchema,
    dividends: fundamentalsDividendsSchema,
    ranges: fundamentalsRangesSchema,
    analyst: analystRatingsSchema,
  })
  .strict();

export type FundamentalsMetrics = z.infer<typeof fundamentalsMetricsSchema>;

export const fundamentalsRecordSchema = z.object({
  instrument_id: uuidSchema,
  metrics: fundamentalsMetricsSchema,
  updated_at: timestamptzSchema,
});

export type FundamentalsRecord = z.infer<typeof fundamentalsRecordSchema>;

export const fundamentalsRecordInsertSchema = z.object({
  instrument_id: uuidSchema,
  metrics: fundamentalsMetricsSchema,
  updated_at: timestamptzSchema.optional(),
});

export type FundamentalsRecordInsert = z.infer<typeof fundamentalsRecordInsertSchema>;

/** Flat seed file metrics from `mock_data/fundamentals.json` (doc 06). */
export const fundamentalsFileMetricsSchema = z
  .object({
    pe: numericSchema.optional(),
    eps_ttm: numericSchema.optional(),
    revenue_b: numericSchema.optional(),
    revenue_growth_pct: numericSchema.optional(),
    gross_margin_pct: numericSchema.optional(),
    net_margin_pct: numericSchema.optional(),
    dividend_yield: numericSchema.optional(),
    shares_out_m: numericSchema.optional(),
    week52_low: numericSchema.optional(),
    week52_high: numericSchema.optional(),
    analyst: analystRatingsSchema.optional(),
    next_earnings: z.string().min(1).optional(),
    expense_ratio: numericSchema.optional(),
    aum_b: numericSchema.optional(),
    valuation: fundamentalsValuationSchema.optional(),
    income: fundamentalsIncomeSchema.partial().optional(),
    margins: fundamentalsMarginsSchema.optional(),
    dividends: fundamentalsDividendsSchema.optional(),
    ranges: fundamentalsRangesSchema.optional(),
  })
  .passthrough();

export const fundamentalsFileRowSchema = z.object({
  symbol: z.string().min(1),
  metrics: fundamentalsFileMetricsSchema,
});

export type FundamentalsFileRow = z.infer<typeof fundamentalsFileRowSchema>;

export const fundamentalsFileSchema = z.array(fundamentalsFileRowSchema);

export const desPeerSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  instrument_id: uuidSchema,
  last: numericSchema.nullable(),
  market_cap_b: numericSchema.nullable(),
});

export type DesPeer = z.infer<typeof desPeerSchema>;

export const desProfileSchema = z.object({
  instrument: instrumentSchema,
  quote: quotesLatestSchema.nullable(),
  fundamentals: fundamentalsRecordSchema,
  peers: z.array(desPeerSchema),
});

export type DesProfile = z.infer<typeof desProfileSchema>;
