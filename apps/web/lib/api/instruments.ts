import { instrumentSchema } from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, ilikeContainsFilter, recordTables } from "./rest";

export function createInstrumentsRepository(client: RecordsClient) {
  return {
    list(options: { symbol?: string; symbolIlike?: string } = {}) {
      return client.list(recordTables.instruments, instrumentSchema, {
        query:
          options.symbol !== undefined
            ? { symbol: eqFilter(options.symbol) }
            : options.symbolIlike !== undefined
              ? { symbol: ilikeContainsFilter(options.symbolIlike), limit: 20 }
              : undefined,
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
