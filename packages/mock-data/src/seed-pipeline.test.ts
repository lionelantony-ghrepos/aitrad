import { describe, expect, it } from "vitest";
import { SEED_ALL_STEPS, type FullSeedCounts } from "@meridian/schemas";
import { assertSeedAllOrder, evaluateFullSeedCounts } from "./seed-pipeline";
import {
  EXPECTED_INSTRUMENTS,
  EXPECTED_MINUTE_BARS_TOTAL,
  EXPECTED_NEWS_EMBEDDINGS,
  EXPECTED_NEWS_ITEMS,
  EXPECTED_FUNDAMENTALS,
  MIN_DAILY_BARS_PER_INSTRUMENT,
} from "./expected-counts";

describe("seed-all pipeline @TC-031-02", () => {
  it("rejects reordered stages", () => {
    expect(() => assertSeedAllOrder(SEED_ALL_STEPS)).not.toThrow();
    const swapped = [...SEED_ALL_STEPS];
    const first = swapped[0];
    const second = swapped[1];
    if (!first || !second) {
      throw new Error("expected steps");
    }
    swapped[0] = second;
    swapped[1] = first;
    expect(() => assertSeedAllOrder(swapped)).toThrow(/SEED_ALL_ORDER/);
  });

  it("fails the verification report on a short user count", () => {
    const counts: FullSeedCounts = {
      instruments: EXPECTED_INSTRUMENTS,
      dailyBars: EXPECTED_INSTRUMENTS * MIN_DAILY_BARS_PER_INSTRUMENT,
      minuteBars: EXPECTED_MINUTE_BARS_TOTAL,
      quotes: EXPECTED_INSTRUMENTS,
      publishedTables: 12,
      newsItems: EXPECTED_NEWS_ITEMS,
      newsEmbeddings: EXPECTED_NEWS_EMBEDDINGS,
      fundamentals: EXPECTED_FUNDAMENTALS,
      users: 3,
      demoPositions: 6,
      watchlists: 3,
    };
    const report = evaluateFullSeedCounts(counts);
    expect(report.ok).toBe(false);
    expect(report.lines.some((line) => line.startsWith("users 3"))).toBe(true);
  });
});
