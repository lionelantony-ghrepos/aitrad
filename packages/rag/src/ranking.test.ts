import { describe, expect, it } from "vitest";
import { NEWS_EMBEDDING_DIM } from "@meridian/schemas";
import {
  RAG_CANNED_FIXTURES,
  RAG_DISTRACTORS,
  hashEmbed,
  hybridRank,
  newsEmbedText,
} from "./index";

function embedCorpus() {
  return [...RAG_CANNED_FIXTURES.map((row) => row.item), ...RAG_DISTRACTORS].map((item) => ({
    item,
    vector: hashEmbed(newsEmbedText(item)),
  }));
}

describe("TC-023-02 canned-query ranking", () => {
  const corpus = embedCorpus();

  it("ranks the obviously-relevant fixture first for 5 canned queries", () => {
    expect(RAG_CANNED_FIXTURES).toHaveLength(5);
    for (const fixture of RAG_CANNED_FIXTURES) {
      const hits = hybridRank({
        queryVector: hashEmbed(fixture.query),
        corpus,
        limit: 5,
      });
      expect(hits[0]?.id, fixture.query).toBe(fixture.item.id);
      expect(hits[0]?.score ?? 0).toBeGreaterThan(hits[1]?.score ?? 0);
    }
  });

  it("applies symbol and since filters before ranking", () => {
    const fixture = RAG_CANNED_FIXTURES[0];
    if (!fixture) {
      throw new Error("MISSING_FIXTURE");
    }
    const hits = hybridRank({
      queryVector: hashEmbed(fixture.query),
      corpus,
      symbols: ["WMT"],
      limit: 5,
    });
    expect(hits.every((row) => row.symbols.includes("WMT"))).toBe(true);
    expect(hits[0]?.id).not.toBe(fixture.item.id);

    const recent = hybridRank({
      queryVector: hashEmbed(fixture.query),
      corpus,
      since: "2026-09-08T00:00:00.000Z",
      limit: 10,
    });
    expect(recent.every((row) => row.ts >= "2026-09-08T00:00:00.000Z")).toBe(true);
  });

  it("emits 1536-d unit vectors", () => {
    const v = hashEmbed("semiconductor earnings beats");
    expect(v).toHaveLength(NEWS_EMBEDDING_DIM);
    const norm = Math.sqrt(v.reduce((s, n) => s + n * n, 0));
    expect(norm).toBeCloseTo(1, 5);
  });
});
