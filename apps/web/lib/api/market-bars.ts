import { marketBarSchema } from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, gteFilter, recordTables } from "./rest";

export function createMarketBarsRepository(client: RecordsClient) {
  return {
    listByInstrument(
      instrumentId: string,
      timeframe?: "1m" | "1d",
      options: { tsGte?: string; signal?: AbortSignal; limit?: number } = {},
    ) {
      return client.list(recordTables.market_bars, marketBarSchema, {
        query: {
          instrument_id: eqFilter(instrumentId),
          timeframe: timeframe === undefined ? undefined : eqFilter(timeframe),
          ts: options.tsGte === undefined ? undefined : gteFilter(options.tsGte),
          order: "ts.asc",
          limit: options.limit ?? 5000,
        },
        signal: options.signal,
      });
    },
  };
}

export type MarketBarsRepository = ReturnType<typeof createMarketBarsRepository>;
