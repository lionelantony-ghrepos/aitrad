import { describe, expect, it } from "vitest";
import type { NewsItem } from "@meridian/schemas";
import { filterNewsItems } from "./filter";

function item(
  partial: Partial<NewsItem> & Pick<NewsItem, "id" | "symbols" | "event_type">,
): NewsItem {
  return {
    ts: "2026-09-09T12:00:00.000Z",
    headline: "h",
    body: "b",
    source: "Reuters",
    sector: "Technology",
    sentiment: 0.2,
    ...partial,
  };
}

describe("filterNewsItems", () => {
  const tsla = item({
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    symbols: ["TSLA"],
    event_type: "earnings",
    ts: "2026-09-09T13:00:00.000Z",
  });
  const aapl = item({
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    symbols: ["AAPL"],
    event_type: "analyst",
    ts: "2026-09-09T14:00:00.000Z",
  });

  it("follows symbol context unless All markets is on", () => {
    expect(
      filterNewsItems([tsla, aapl], { allMarkets: false, symbol: "TSLA", eventTypes: [] }).map(
        (r) => r.id,
      ),
    ).toEqual([tsla.id]);
    expect(
      filterNewsItems([tsla, aapl], { allMarkets: true, symbol: "TSLA", eventTypes: [] }).map(
        (r) => r.id,
      ),
    ).toEqual([aapl.id, tsla.id]);
  });

  it("applies event-type chips as an allow-list", () => {
    expect(
      filterNewsItems([tsla, aapl], {
        allMarkets: true,
        symbol: null,
        eventTypes: ["earnings"],
      }).map((r) => r.id),
    ).toEqual([tsla.id]);
  });
});
