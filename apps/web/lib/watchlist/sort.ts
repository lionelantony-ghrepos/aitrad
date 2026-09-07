export type WatchlistSortKey = "symbol" | "last" | "netChange" | "pctChange" | "volume";

export type WatchlistSortableRow = {
  symbol: string;
  last: number | null;
  netChange: number | null;
  pctChange: number | null;
  volume: number | null;
};

export function compareWatchlistRows(
  left: WatchlistSortableRow,
  right: WatchlistSortableRow,
  key: WatchlistSortKey,
  dir: "asc" | "desc",
): number {
  const sign = dir === "asc" ? 1 : -1;
  if (key === "symbol") {
    return sign * left.symbol.localeCompare(right.symbol);
  }
  const lv = left[key];
  const rv = right[key];
  if (lv === null && rv === null) {
    return 0;
  }
  if (lv === null) {
    return 1;
  }
  if (rv === null) {
    return -1;
  }
  return sign * (lv - rv);
}
