import {
  watchlistInsertSchema,
  watchlistItemInsertSchema,
  watchlistItemSchema,
  watchlistSchema,
  type Watchlist,
  type WatchlistInsert,
  type WatchlistItem,
  type WatchlistItemInsert,
  type WatchlistPatch,
} from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, recordTables } from "./rest";

export function createWatchlistsRepository(client: RecordsClient) {
  return {
    listMine() {
      return client.list(recordTables.watchlists, watchlistSchema);
    },
    getById(id: string) {
      return client
        .list(recordTables.watchlists, watchlistSchema, { query: { id: eqFilter(id) } })
        .then((rows) => rows[0] ?? null);
    },
    insert(row: WatchlistInsert) {
      return client.insert(recordTables.watchlists, watchlistSchema, [
        watchlistInsertSchema.parse(row),
      ]);
    },
    update(id: string, patch: WatchlistPatch) {
      return client.update(recordTables.watchlists, watchlistSchema, { id: eqFilter(id) }, patch);
    },
    remove(id: string) {
      return client.remove(recordTables.watchlists, { id: eqFilter(id) });
    },
  };
}

export function createWatchlistItemsRepository(client: RecordsClient) {
  return {
    listByWatchlist(watchlistId: string) {
      return client.list(recordTables.watchlist_items, watchlistItemSchema, {
        query: { watchlist_id: eqFilter(watchlistId) },
      });
    },
    insert(row: WatchlistItemInsert) {
      return client.insert(recordTables.watchlist_items, watchlistItemSchema, [
        watchlistItemInsertSchema.parse(row),
      ]);
    },
    remove(id: string) {
      return client.remove(recordTables.watchlist_items, { id: eqFilter(id) });
    },
  };
}

export type WatchlistsRepository = ReturnType<typeof createWatchlistsRepository>;
export type WatchlistItemsRepository = ReturnType<typeof createWatchlistItemsRepository>;

export type { Watchlist, WatchlistItem };
