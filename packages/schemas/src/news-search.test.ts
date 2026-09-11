import { describe, expect, it } from "vitest";
import { newsSearchRequestSchema, NEWS_SEARCH_LIMIT } from "./news-search";

describe("news search DTOs", () => {
  it("accepts query plus optional symbol and since filters", () => {
    const parsed = newsSearchRequestSchema.parse({
      query: "earnings beats in semis this week",
      symbols: ["NVDA"],
      since: "2026-09-01T00:00:00.000Z",
      limit: 10,
    });
    expect(parsed.query).toContain("semis");
    expect(parsed.symbols).toEqual(["NVDA"]);
  });

  it("rejects an empty query and an oversize limit", () => {
    expect(newsSearchRequestSchema.safeParse({ query: "   " }).success).toBe(false);
    expect(
      newsSearchRequestSchema.safeParse({ query: "ok", limit: NEWS_SEARCH_LIMIT + 1 }).success,
    ).toBe(false);
  });
});
