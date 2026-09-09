import { fundamentalsRecordSchema } from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, inFilter, recordTables } from "./rest";

export function createFundamentalsRepository(client: RecordsClient) {
  return {
    getByInstrumentId(instrumentId: string) {
      return client
        .list(recordTables.fundamentals, fundamentalsRecordSchema, {
          query: { instrument_id: eqFilter(instrumentId), limit: 1 },
        })
        .then((rows) => rows[0] ?? null);
    },
    listByInstrumentIds(instrumentIds: readonly string[]) {
      if (instrumentIds.length === 0) {
        return Promise.resolve([]);
      }
      return client.list(recordTables.fundamentals, fundamentalsRecordSchema, {
        query: { instrument_id: inFilter(instrumentIds) },
      });
    },
  };
}

export type FundamentalsRepository = ReturnType<typeof createFundamentalsRepository>;
