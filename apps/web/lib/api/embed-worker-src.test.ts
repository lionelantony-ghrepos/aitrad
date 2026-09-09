import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { searchNewsServiceUrl } from "./search-news";

const here = fileURLToPath(new URL(".", import.meta.url));
const src = readFileSync(
  path.join(here, "../../../../insforge/functions/embed-worker-src.ts"),
  "utf8",
);
const searchSrc = readFileSync(
  path.join(here, "../../../../insforge/functions/search-news-src.ts"),
  "utf8",
);

describe("embed-worker source", () => {
  it("is service-key gated, embeds news_items only, and dead-letters gateway failures", () => {
    expect(src).toContain("UNAUTHENTICATED");
    expect(src).toContain("list_pending_news_embeds");
    expect(src).toContain("runEmbedCycle");
    expect(src).toContain("news_embed_dead_letters");
    expect(src).toContain("news_embeddings");
    expect(src).toContain("OPENROUTER_API_KEY");
    expect(src).toContain('action: "embed-worker"');
    expect(src).not.toContain("readdir");
    expect(src).not.toContain('.from("documents")');
  });
});

describe("search-news source", () => {
  it("authorizes news:search, embeds the query, and RPCs hybrid search", () => {
    expect(searchNewsServiceUrl("https://app.insforge.app/")).toBe(
      "https://app.insforge.app/functions/search-news",
    );
    expect(searchSrc).toContain('authorize({ userId, action: "news:search" })');
    expect(searchSrc).toContain('rpc("search_news_hybrid"');
    expect(searchSrc).toContain("SEARCH_UNAVAILABLE");
    expect(searchSrc).toContain('action: "news:search"');
  });
});
