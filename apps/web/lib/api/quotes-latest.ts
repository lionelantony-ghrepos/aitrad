import { quotesLatestSchema } from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, recordTables } from "./rest";

export function createQuotesLatestRepository(client: RecordsClient) {
  return {
    getByInstrumentId(instrumentId: string) {
      return client
        .list(recordTables.quotes_latest, quotesLatestSchema, {
          query: { instrument_id: eqFilter(instrumentId), limit: 1 },
        })
        .then((rows) => rows[0] ?? null);
    },
  };
}

export type QuotesLatestRepository = ReturnType<typeof createQuotesLatestRepository>;
