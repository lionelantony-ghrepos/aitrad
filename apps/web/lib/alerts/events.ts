import { TEST_ALERTS_CHANGED_EVENT } from "./transport";

export { TEST_ALERTS_CHANGED_EVENT };
export const OPEN_WATCHLIST_ALERTS_EVENT = "meridian:open-watchlist-alerts";

export function notifyAlertsChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(TEST_ALERTS_CHANGED_EVENT));
}

export function openWatchlistAlertsTab(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(OPEN_WATCHLIST_ALERTS_EVENT));
}
