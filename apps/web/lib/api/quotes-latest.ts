import { quotesLatestSchema } from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, inFilter, recordTables } from "./rest";

export function createQuotesLatestRepository(client: RecordsClient) {
  return {
    getByInstrumentId(instrumentId: string) {
      return client
        .list(recordTables.quotes_latest, quotesLatestSchema, {
          query: { instrument_id: eqFilter(instrumentId), limit: 1 },
        })
        .then((rows) => rows[0] ?? null);
    },
    listByInstrumentIds(instrumentIds: readonly string[]) {
      if (instrumentIds.length === 0) {
        return Promise.resolve([]);
      }
      return client.list(recordTables.quotes_latest, quotesLatestSchema, {
        query: { instrument_id: inFilter(instrumentIds) },
      });
    },
  };
}

export type QuotesLatestRepository = ReturnType<typeof createQuotesLatestRepository>;
