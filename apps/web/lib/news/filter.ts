import type { NewsEventType, NewsItem } from "@meridian/schemas";

export const NEWS_EVENT_TYPES: readonly NewsEventType[] = [
  "earnings",
  "analyst",
  "macro",
  "product",
  "regulatory",
  "mna",
];

export function filterNewsItems(
  items: readonly NewsItem[],
  input: {
    allMarkets: boolean;
    symbol: string | null;
    eventTypes: readonly NewsEventType[];
  },
): NewsItem[] {
  const types = new Set(input.eventTypes);
  const symbol = input.symbol?.trim().toUpperCase() ?? "";
  return [...items]
    .filter((item) => (types.size === 0 ? true : types.has(item.event_type)))
    .filter((item) => {
      if (input.allMarkets) {
        return true;
      }
      if (!symbol) {
        return false;
      }
      return item.symbols.some((tagged) => tagged.toUpperCase() === symbol);
    })
    .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
}
