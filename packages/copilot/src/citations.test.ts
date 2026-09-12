import { describe, expect, it } from "vitest";
import { extractCitations, splitMarkdownCitations } from "./citations";
import { expandSlashPrompt, matchingSlashSuggestions } from "./slash";

describe("citations and slash", () => {
  it("extracts news and DES tokens", () => {
    const id = "55555555-5555-4555-8555-555555555553";
    const citations = extractCitations(`See [news:${id}] and [des:AAPL]`, new Map());
    expect(citations.map((row) => row.kind)).toEqual(["news", "des"]);
    const parts = splitMarkdownCitations(`x [news:${id}] y`, citations);
    expect(parts.some((part) => part.type === "citation")).toBe(true);
  });

  it("expands slash prompts", () => {
    expect(expandSlashPrompt("/news", "AAPL")).toContain("search_news");
    expect(matchingSlashSuggestions("/n").map((row) => row.command)).toEqual(["/news"]);
  });
});
