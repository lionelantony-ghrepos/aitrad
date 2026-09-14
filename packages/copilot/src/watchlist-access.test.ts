import { describe, expect, it } from "vitest";
import {
  COPILOT_WATCHLIST_NOT_FOUND,
  assertOwnedWatchlist,
  insertOwnedWatchlistItemAsAdmin,
  type AdminWatchlistWritePorts,
} from "./watchlist-access";

const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const OWNED_LIST = "33333333-3333-4333-8333-333333333333";
const FOREIGN_LIST = "44444444-4444-4444-8444-444444444444";
const INSTRUMENT = "55555555-5555-4555-8555-555555555555";

function memoryPorts(): {
  ports: AdminWatchlistWritePorts;
  inserts: Array<{ watchlist_id: string; instrument_id: string; sort_order: number }>;
} {
  const rows = [
    { id: OWNED_LIST, user_id: OWNER },
    { id: FOREIGN_LIST, user_id: OTHER },
  ];
  const inserts: Array<{ watchlist_id: string; instrument_id: string; sort_order: number }> = [];
  const ports: AdminWatchlistWritePorts = {
    // Insecure id-only lookup: the helper must still refuse a foreign row.
    findWatchlist: async ({ id, userId }) => {
      if (id) {
        return rows.find((row) => row.id === id) ?? null;
      }
      return rows.find((row) => row.user_id === userId) ?? null;
    },
    createDefaultWatchlist: async () => {
      throw new Error("should not create default watchlist");
    },
    countItems: async () => 0,
    insertItem: async (row) => {
      inserts.push(row);
      return { id: "watch-item-stolen" };
    },
  };
  return { ports, inserts };
}

describe("admin watchlist ownership", () => {
  it("rejects missing and foreign watchlists", () => {
    expect(() => assertOwnedWatchlist({ watchlist: null, userId: OWNER })).toThrow(
      COPILOT_WATCHLIST_NOT_FOUND,
    );
    expect(() => assertOwnedWatchlist({ watchlist: { user_id: OTHER }, userId: OWNER })).toThrow(
      COPILOT_WATCHLIST_NOT_FOUND,
    );
    expect(() =>
      assertOwnedWatchlist({ watchlist: { user_id: OWNER }, userId: OWNER }),
    ).not.toThrow();
  });

  it("does not insert into a foreign watchlist_id via admin path", async () => {
    const { ports, inserts } = memoryPorts();
    const result = await insertOwnedWatchlistItemAsAdmin({
      userId: OWNER,
      watchlistId: FOREIGN_LIST,
      instrumentId: INSTRUMENT,
      ports,
    });
    expect(result).toEqual({ error: COPILOT_WATCHLIST_NOT_FOUND });
    expect(inserts).toEqual([]);
  });

  it("does not insert when the watchlist_id is missing", async () => {
    const { ports, inserts } = memoryPorts();
    const result = await insertOwnedWatchlistItemAsAdmin({
      userId: OWNER,
      watchlistId: "66666666-6666-4666-8666-666666666666",
      instrumentId: INSTRUMENT,
      ports: {
        ...ports,
        findWatchlist: async () => null,
      },
    });
    expect(result).toEqual({ error: COPILOT_WATCHLIST_NOT_FOUND });
    expect(inserts).toEqual([]);
  });

  it("inserts only after the watchlist is owned", async () => {
    const { ports, inserts } = memoryPorts();
    const result = await insertOwnedWatchlistItemAsAdmin({
      userId: OWNER,
      watchlistId: OWNED_LIST,
      instrumentId: INSTRUMENT,
      ports,
    });
    expect(result).toEqual({ ref: "watch-item-stolen" });
    expect(inserts).toEqual([
      { watchlist_id: OWNED_LIST, instrument_id: INSTRUMENT, sort_order: 0 },
    ]);
  });
});
