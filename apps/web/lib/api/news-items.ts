import { newsItemSchema } from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { containsArrayFilter, recordTables } from "./rest";

export function createNewsItemsRepository(client: RecordsClient) {
  return {
    list(options: { symbol?: string; limit?: number } = {}) {
      return client.list(recordTables.news_items, newsItemSchema, {
        query: {
          order: "ts.desc",
          limit: options.limit ?? 400,
          symbols: options.symbol ? containsArrayFilter([options.symbol]) : undefined,
        },
      });
    },
  };
}

export type NewsItemsRepository = ReturnType<typeof createNewsItemsRepository>;
