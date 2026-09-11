export const WATCHLIST_CHANGED_EVENT = "meridian:watchlist-changed";

export function notifyWatchlistChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(WATCHLIST_CHANGED_EVENT));
}
