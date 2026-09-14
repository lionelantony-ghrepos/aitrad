export const COPILOT_WATCHLIST_NOT_FOUND = "WATCHLIST_NOT_FOUND";

export function assertOwnedWatchlist<T extends { user_id: string }>(input: {
  watchlist: T | null | undefined;
  userId: string;
}): asserts input is { watchlist: T; userId: string } {
  if (!input.watchlist || input.watchlist.user_id !== input.userId) {
    throw new Error(COPILOT_WATCHLIST_NOT_FOUND);
  }
}

export type AdminWatchlistRow = { id: string; user_id: string };

export type AdminWatchlistWritePorts = {
  /** Must constrain `id` (when set) AND `user_id` — admin clients bypass RLS. */
  findWatchlist: (input: { id?: string; userId: string }) => Promise<AdminWatchlistRow | null>;
  createDefaultWatchlist: (userId: string) => Promise<AdminWatchlistRow>;
  countItems: (watchlistId: string) => Promise<number>;
  insertItem: (row: {
    watchlist_id: string;
    instrument_id: string;
    sort_order: number;
  }) => Promise<{ id: string } | null>;
};

/**
 * Admin/service insert into `watchlist_items`. Rejects missing or foreign
 * `watchlist_id` before any insert (no silent write onto another user's list).
 */
export async function insertOwnedWatchlistItemAsAdmin(input: {
  userId: string;
  watchlistId?: string;
  instrumentId: string;
  ports: AdminWatchlistWritePorts;
}): Promise<{ ref?: string; error?: string }> {
  let watchlist: AdminWatchlistRow | null = null;
  if (input.watchlistId) {
    watchlist = await input.ports.findWatchlist({
      id: input.watchlistId,
      userId: input.userId,
    });
  } else {
    watchlist = await input.ports.findWatchlist({ userId: input.userId });
    if (!watchlist) {
      watchlist = await input.ports.createDefaultWatchlist(input.userId);
    }
  }
  try {
    assertOwnedWatchlist({ watchlist, userId: input.userId });
  } catch {
    return { error: COPILOT_WATCHLIST_NOT_FOUND };
  }
  const sortOrder = await input.ports.countItems(watchlist.id);
  const created = await input.ports.insertItem({
    watchlist_id: watchlist.id,
    instrument_id: input.instrumentId,
    sort_order: sortOrder,
  });
  return created?.id ? { ref: created.id } : { error: "WATCHLIST_ITEM_FAILED" };
}
