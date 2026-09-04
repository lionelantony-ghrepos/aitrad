import { z } from "zod";
import { marketBarSchema } from "./entities";

export const chartRangeSchema = z.enum(["1D", "1W", "1M", "1Y", "5Y"]);

export type ChartRange = z.infer<typeof chartRangeSchema>;

export const chartBarsQuerySchema = z.object({
  symbol: z.string().min(1).max(16),
  range: chartRangeSchema,
});

export type ChartBarsQuery = z.infer<typeof chartBarsQuerySchema>;

export const chartBarsResponseSchema = z.object({
  symbol: z.string().min(1),
  instrument_id: z.string().uuid(),
  range: chartRangeSchema,
  timeframe: z.enum(["1m", "1d"]),
  bars: z.array(marketBarSchema),
});

export type ChartBarsResponse = z.infer<typeof chartBarsResponseSchema>;
