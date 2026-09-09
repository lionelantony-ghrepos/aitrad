import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  HISTORY_SEED,
  NEWS_BACKFILL_COUNT,
  NEWS_LIVE_MAX_ITEMS,
  NEWS_LIVE_MIN_ITEMS,
  generateNewsBackfill,
  generateNewsItem,
  newsPriceNudgeBps,
  newsSentimentDriftNudgeBps,
  parseInstrumentsJson,
  parseNewsTemplatesJson,
  planNewsTickerInvocation,
} from "./index";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "../../..");

function loadUniverse() {
  return parseInstrumentsJson(
    JSON.parse(readFileSync(path.join(root, "mock_data/instruments.json"), "utf8")) as unknown,
  );
}

function loadTemplates() {
  return parseNewsTemplatesJson(
    JSON.parse(readFileSync(path.join(root, "mock_data/news-templates.json"), "utf8")) as unknown,
  );
}

describe("TC-019-02 news generator", () => {
  const universe = loadUniverse();
  const templates = loadTemplates();

  it("fills templates without leftover slots and stays in sentiment range", () => {
    const item = generateNewsItem({
      universe,
      templates,
      index: 7,
      seed: HISTORY_SEED,
      ts: "2026-09-01T14:00:00.000Z",
    });
    expect(item.headline).not.toMatch(/\{[a-z]+\}/i);
    expect(item.body).not.toMatch(/\{[a-z]+\}/i);
    expect(item.sentiment).toBeGreaterThanOrEqual(-1);
    expect(item.sentiment).toBeLessThanOrEqual(1);
    expect(item.symbols.length).toBeGreaterThan(0);
    expect(item.body.split(/(?<=\.)\s/).length).toBeGreaterThanOrEqual(2);
  });

  it("is deterministic for the same seed and index (TC-019-02)", () => {
    const a = generateNewsBackfill({
      universe,
      templates,
      count: 40,
      seed: HISTORY_SEED,
      endIso: "2026-09-09T20:00:00.000Z",
    });
    const b = generateNewsBackfill({
      universe,
      templates,
      count: 40,
      seed: HISTORY_SEED,
      endIso: "2026-09-09T20:00:00.000Z",
    });
    expect(a).toEqual(b);
    expect(a).toHaveLength(40);
  });

  it("changes output when the seed changes", () => {
    const a = generateNewsItem({
      universe,
      templates,
      index: 3,
      seed: 42,
      ts: "2026-09-01T14:00:00.000Z",
    });
    const b = generateNewsItem({
      universe,
      templates,
      index: 3,
      seed: 43,
      ts: "2026-09-01T14:00:00.000Z",
    });
    expect(a).not.toEqual(b);
  });

  it("backfills 500 items over 30 days", () => {
    const rows = generateNewsBackfill({ universe, templates });
    expect(rows).toHaveLength(NEWS_BACKFILL_COUNT);
    expect(new Set(rows.map((row) => row.id)).size).toBe(NEWS_BACKFILL_COUNT);
    const first = rows[0];
    const last = rows[rows.length - 1];
    expect(first).toBeDefined();
    expect(last).toBeDefined();
    if (!first || !last) {
      return;
    }
    const firstTs = Date.parse(first.ts);
    const lastTs = Date.parse(last.ts);
    expect(lastTs).toBeGreaterThan(firstTs);
    expect(lastTs - firstTs).toBeGreaterThan(20 * 24 * 60 * 60 * 1000);
  });

  it("emits 1-5 items per simulated 5-minute window", () => {
    const paused = planNewsTickerInvocation({
      intervalSeconds: 60,
      speed: 5,
      paused: true,
      simElapsedSec: 0,
      universe,
      templates,
      nowIso: "2026-09-09T14:00:00.000Z",
    });
    expect(paused.items).toHaveLength(0);

    const live = planNewsTickerInvocation({
      intervalSeconds: 60,
      speed: 5,
      paused: false,
      simElapsedSec: 0,
      universe,
      templates,
      nowIso: "2026-09-09T14:00:00.000Z",
    });
    expect(live.bursts).toBe(1);
    expect(live.items.length).toBeGreaterThanOrEqual(NEWS_LIVE_MIN_ITEMS);
    expect(live.items.length).toBeLessThanOrEqual(NEWS_LIVE_MAX_ITEMS);
    expect(
      planNewsTickerInvocation({
        intervalSeconds: 60,
        speed: 5,
        paused: false,
        simElapsedSec: 0,
        universe,
        templates,
        nowIso: "2026-09-09T14:00:00.000Z",
      }).items,
    ).toEqual(live.items);
  });

  it("exposes a DT-SIM-01 price nudge proportional to sentiment", () => {
    expect(newsSentimentDriftNudgeBps(0.5, false)).toBe(0);
    expect(newsPriceNudgeBps(1)).toBe(newsSentimentDriftNudgeBps(1, true));
    expect(newsPriceNudgeBps(-0.4)).toBeCloseTo(-newsPriceNudgeBps(0.4));
    expect(Math.abs(newsPriceNudgeBps(1))).toBeGreaterThan(Math.abs(newsPriceNudgeBps(0.2)));
  });
});
