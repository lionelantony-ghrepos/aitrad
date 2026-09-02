import { marketBarSchema } from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, recordTables } from "./rest";

export function createMarketBarsRepository(client: RecordsClient) {
  return {
    listByInstrument(instrumentId: string, timeframe?: "1m" | "1d") {
      return client.list(recordTables.market_bars, marketBarSchema, {
        query: {
          instrument_id: eqFilter(instrumentId),
          timeframe: timeframe === undefined ? undefined : eqFilter(timeframe),
        },
      });
    },
  };
}

export type MarketBarsRepository = ReturnType<typeof createMarketBarsRepository>;
