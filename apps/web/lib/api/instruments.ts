import { instrumentSchema } from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, recordTables } from "./rest";

export function createInstrumentsRepository(client: RecordsClient) {
  return {
    list(options: { symbol?: string } = {}) {
      return client.list(recordTables.instruments, instrumentSchema, {
        query: options.symbol === undefined ? undefined : { symbol: eqFilter(options.symbol) },
      });
    },
    getById(id: string) {
      return client
        .list(recordTables.instruments, instrumentSchema, { query: { id: eqFilter(id) } })
        .then((rows) => rows[0] ?? null);
    },
  };
}

export type InstrumentsRepository = ReturnType<typeof createInstrumentsRepository>;
