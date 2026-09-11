import type { NewsItem, NewsSearchHit } from "@meridian/schemas";
import { NEWS_SEARCH_LIMIT } from "@meridian/schemas";
import { cosineSimilarity } from "./vector";

export type EmbeddedNews = {
  item: NewsItem;
  vector: readonly number[];
};

export function newsEmbedText(item: Pick<NewsItem, "headline" | "body">): string {
  return `${item.headline}\n${item.body}`;
}

export function hybridRank(input: {
  queryVector: readonly number[];
  corpus: readonly EmbeddedNews[];
  symbols?: readonly string[];
  since?: string;
  limit?: number;
}): NewsSearchHit[] {
  const limit = input.limit ?? 10;
  const cap = Math.min(Math.max(limit, 1), NEWS_SEARCH_LIMIT);
  const symbolSet = input.symbols?.length
    ? new Set(input.symbols.map((s) => s.toUpperCase()))
    : null;
  const sinceMs = input.since ? Date.parse(input.since) : Number.NaN;
  const ranked: NewsSearchHit[] = [];
  for (const row of input.corpus) {
    if (symbolSet) {
      const hit = row.item.symbols.some((s) => symbolSet.has(s.toUpperCase()));
      if (!hit) {
        continue;
      }
    }
    if (Number.isFinite(sinceMs) && Date.parse(row.item.ts) < sinceMs) {
      continue;
    }
    const score = cosineSimilarity(input.queryVector, row.vector);
    ranked.push({ ...row.item, score });
  }
  ranked.sort((a, b) => b.score - a.score || (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
  return ranked.slice(0, cap);
}
