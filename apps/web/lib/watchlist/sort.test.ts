import { describe, expect, it } from "vitest";
import { compareWatchlistRows, type WatchlistSortKey } from "./sort";

const aapl = {
  symbol: "AAPL",
  last: 200,
  netChange: 10,
  pctChange: 5,
  volume: 100,
};

const msft = {
  symbol: "MSFT",
  last: 400,
  netChange: -2,
  pctChange: -0.5,
  volume: 50,
};

describe("watchlist column sort", () => {
  it.each([
    ["symbol", "asc", ["AAPL", "MSFT"]],
    ["symbol", "desc", ["MSFT", "AAPL"]],
    ["last", "desc", ["MSFT", "AAPL"]],
    ["pctChange", "asc", ["MSFT", "AAPL"]],
    ["volume", "desc", ["AAPL", "MSFT"]],
  ] as const satisfies ReadonlyArray<readonly [WatchlistSortKey, "asc" | "desc", string[]]>)(
    "sorts by %s %s",
    (key, dir, expected) => {
      const rows = [msft, aapl].sort((left, right) => compareWatchlistRows(left, right, key, dir));
      expect(rows.map((r) => r.symbol)).toEqual(expected);
    },
  );
});
