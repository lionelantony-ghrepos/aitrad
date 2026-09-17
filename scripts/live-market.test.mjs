import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  DAILY_INTERVAL,
  DAILY_RANGE,
  PRIORITY,
  captureSnapshot,
  classifyEvent,
  emptySnapshot,
  isSnapshotCaptured,
  loadInstrumentUniverse,
  mapDailyBarFromChart,
  mapNewsRecord,
  mapQuoteFromChart,
  originalBody,
  readSnapshot,
  renderSourceMarkdown,
  roundToTick,
  snapshotDir,
  stableUuid,
  writeSnapshot,
  yahooSymbolFor,
} from "./lib/live-market.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sampleChart(last = 100.04) {
  return {
    meta: {
      regularMarketPrice: last,
      chartPreviousClose: 99.5,
      regularMarketVolume: 123,
      fiftyTwoWeekHigh: 120.01,
      fiftyTwoWeekLow: 80.49,
    },
    timestamp: [1_700_000_000],
    indicators: {
      quote: [
        {
          open: [99.1],
          high: [101.2],
          low: [98.3],
          close: [100.04],
          volume: [50],
        },
      ],
    },
  };
}

describe("live-market snapshot helpers", () => {
  it("maps Yahoo class symbols and ticks", () => {
    assert.equal(yahooSymbolFor("BRK.B"), "BRK-B");
    assert.equal(yahooSymbolFor("SQ"), "XYZ");
    assert.equal(roundToTick(100.044, 0.01), 100.04);
    assert.equal(roundToTick(333.85 - 0.01, 0.01), 333.84);
  });

  it("maps quote + daily bar with OHLC invariants", () => {
    const quote = mapQuoteFromChart(sampleChart(), 0.01);
    assert.equal(quote.last, 100.04);
    assert.equal(quote.prev_close, 99.5);
    assert.ok(quote.bid <= quote.last);
    assert.ok(quote.ask >= quote.last);
    const bar = mapDailyBarFromChart(sampleChart(), 0.01, quote.last);
    assert.ok(bar);
    assert.ok(bar.l <= Math.min(bar.o, bar.c));
    assert.ok(bar.h >= Math.max(bar.o, bar.c));
  });

  it("writes original two-sentence news bodies, not article reprints", () => {
    const body = originalBody("AAPL", "Apple beats estimates");
    assert.match(body, /original two-sentence summary/);
    assert.equal(classifyEvent("Apple beats estimates on EPS"), "earnings");
    const rec = mapNewsRecord("AAPL", {
      headline: "Apple beats estimates",
      ts: "2026-09-17T00:00:00.000Z",
      source: "Yahoo Finance news",
    });
    assert.equal(rec.body, body);
    assert.doesNotMatch(rec.body, /https?:\/\//);
    assert.equal(stableUuid("a"), stableUuid("a"));
    assert.notEqual(stableUuid("a"), stableUuid("b"));
  });

  it("round-trips a captured snapshot and SOURCE.md required notes", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "meridian-snap-"));
    try {
      const empty = emptySnapshot({ asOfUtc: null, reason: "test" });
      assert.equal(isSnapshotCaptured(empty.manifest), false);
      const snapshot = {
        manifest: {
          ...empty.manifest,
          status: "captured",
          asOfUtc: "2026-09-17T12:00:00.000Z",
          universe: ["AAPL"],
          counts: { quotes: 1, dailyBars: 1, minuteBars: 0, fundamentalsRanges: 1, news: 1 },
          failedSymbols: [],
          reason: null,
        },
        quotes: [
          {
            symbol: "AAPL",
            last: 1,
            prev_close: 1,
            bid: 1,
            ask: 1.01,
            volume: 1,
            ts: "2026-09-17T12:00:00.000Z",
          },
        ],
        dailyBars: [
          { symbol: "AAPL", ts: "2026-09-17T00:00:00.000Z", o: 1, h: 1, l: 1, c: 1, v: 1 },
        ],
        minuteBars: [],
        fundamentalsRanges: [{ symbol: "AAPL", week52_high: 2, week52_low: 1 }],
        news: [
          mapNewsRecord("AAPL", {
            headline: "Test headline",
            ts: "2026-09-17T00:00:00.000Z",
            source: "Yahoo Finance news",
          }),
        ],
      };
      writeSnapshot(dir, snapshot);
      const loaded = readSnapshot(dir);
      assert.equal(isSnapshotCaptured(loaded.manifest), true);
      assert.equal(loaded.quotes[0]?.last, 1);
      const md = renderSourceMarkdown(loaded);
      assert.match(md, /2026-09-17T12:00:00.000Z/);
      assert.match(md, /PRIORITY|AAPL MSFT NVDA/);
      assert.match(md, /original two-sentence/);
      assert.match(md, /offline/);
      assert.match(md, new RegExp(DAILY_RANGE));
      assert.match(md, new RegExp(DAILY_INTERVAL));
      assert.match(md, /pnpm market:freeze/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("loads the seeded instrument universe including PRIORITY names", () => {
    const universe = loadInstrumentUniverse(repoRoot);
    assert.equal(universe.length, 150);
    for (const sym of PRIORITY) {
      assert.ok(
        universe.some((row) => row.symbol === sym),
        `missing ${sym}`,
      );
    }
    assert.equal(path.basename(snapshotDir(repoRoot)), "market-snapshot");
  });

  it("captureSnapshot uses injected fetchers (no live Yahoo)", async () => {
    const snapshot = await captureSnapshot({
      universe: [{ symbol: "AAPL", tick_size: 0.01, sector: "Technology" }],
      delayMs: 0,
      fetchChart: async (_symbol, range) => {
        if (range === "1d") {
          return {
            timestamp: [1_700_000_060],
            indicators: {
              quote: [{ open: [100], high: [101], low: [99], close: [100.5], volume: [10] }],
            },
            meta: {},
          };
        }
        return sampleChart(188.12);
      },
      fetchHeadlines: async () => [
        { headline: "AAPL upgrade", ts: "2026-09-17T00:00:00.000Z", source: "Yahoo Finance news" },
      ],
    });
    assert.equal(isSnapshotCaptured(snapshot.manifest), true);
    assert.equal(snapshot.quotes[0]?.last, 188.12);
    assert.equal(snapshot.news[0]?.event_type, "analyst");
    assert.equal(snapshot.minuteBars.length, 1);
  });
});
