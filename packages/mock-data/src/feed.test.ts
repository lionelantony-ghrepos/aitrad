import { describe, expect, it } from "vitest";
import {
  HISTORY_SEED,
  coalesceQuoteBatches,
  minuteBucketTs,
  normalizeBarsToUpsert,
  nyseSessionState,
  nyseTradingSessions,
  parseFeedControls,
  rollMinuteBar,
  runFeedInvocation,
  stepGbmPrice,
  type FeedBarWrite,
} from "./index";

describe("AC-006-01 NYSE 2026 calendar", () => {
  it("seeds NYSE 2026 sessions including Thanksgiving Friday and Christmas Eve half-days", () => {
    const rows = nyseTradingSessions(2026);
    expect(rows.length).toBeGreaterThan(240);
    const byDate = new Map(rows.map((r) => [r.session_date, r]));
    expect(byDate.has("2026-11-26")).toBe(false);
    expect(byDate.get("2026-11-27")?.session_kind).toBe("half");
    expect(byDate.get("2026-12-24")?.session_kind).toBe("half");
    expect(byDate.get("2026-09-02")?.session_kind).toBe("regular");
  });

  it("is OPEN during a regular session and CLOSED after close or on a holiday", () => {
    const rows = nyseTradingSessions(2026);
    expect(nyseSessionState(new Date("2026-09-02T14:00:00.000Z"), rows)).toBe("OPEN");
    expect(nyseSessionState(new Date("2026-09-02T20:30:00.000Z"), rows)).toBe("CLOSED");
    expect(nyseSessionState(new Date("2026-11-26T15:00:00.000Z"), rows)).toBe("CLOSED");
    expect(nyseSessionState(new Date("2026-11-27T15:00:00.000Z"), rows)).toBe("OPEN");
    expect(nyseSessionState(new Date("2026-11-27T18:30:00.000Z"), rows)).toBe("CLOSED");
  });
});

describe("GBM stepper", () => {
  it("is deterministic for the same symbol, last, and sim second", () => {
    const input = {
      last: 100,
      tickSize: 0.01,
      betaClass: "medium" as const,
      symbol: "AAPL",
      simEpochSec: 1_700_000_000,
      seed: HISTORY_SEED,
      sessionOpen: true,
      sessionOpenStart: false,
    };
    expect(stepGbmPrice(input)).toEqual(stepGbmPrice(input));
  });

  it("does not move price when the session is closed", () => {
    const stepped = stepGbmPrice({
      last: 100,
      tickSize: 0.01,
      betaClass: "high",
      symbol: "TSLA",
      simEpochSec: 1,
      seed: HISTORY_SEED,
      sessionOpen: false,
      sessionOpenStart: false,
    });
    expect(stepped.last).toBe(100);
    expect(stepped.appliedGap).toBe(false);
  });

  it("occasionally applies a DT-SIM-01 open gap when the session starts", () => {
    let hit: { last: number } | undefined;
    for (let sec = 0; sec < 20_000; sec += 1) {
      const stepped = stepGbmPrice({
        last: 100,
        tickSize: 0.01,
        betaClass: "low",
        symbol: "KO",
        simEpochSec: sec * 86400,
        seed: HISTORY_SEED,
        sessionOpen: true,
        sessionOpenStart: true,
      });
      if (stepped.appliedGap) {
        hit = stepped;
        break;
      }
    }
    expect(hit).toBeDefined();
  });
});

describe("AC-006-02 bar roll and coalesce", () => {
  it("rolls a completed 1m bar when the tick crosses the minute boundary", () => {
    const first = rollMinuteBar(null, {
      last: 10,
      volumeDelta: 5,
      ts: "2026-09-02T14:00:10.000Z",
      tickSize: 0.01,
    });
    expect(first.completed).toBeNull();
    expect(first.current.ts).toBe(minuteBucketTs("2026-09-02T14:00:10.000Z"));
    expect(first.current.o).toBe(10);
    expect(first.current.c).toBe(10);
    expect(first.current.v).toBe(5);

    const same = rollMinuteBar(first.current, {
      last: 11,
      volumeDelta: 3,
      ts: "2026-09-02T14:00:50.000Z",
      tickSize: 0.01,
    });
    expect(same.completed).toBeNull();
    expect(same.current.h).toBe(11);
    expect(same.current.l).toBe(10);
    expect(same.current.c).toBe(11);
    expect(same.current.v).toBe(8);

    const next = rollMinuteBar(same.current, {
      last: 9,
      volumeDelta: 2,
      ts: "2026-09-02T14:01:00.000Z",
      tickSize: 0.01,
    });
    expect(next.completed?.c).toBe(11);
    expect(next.completed?.v).toBe(8);
    expect(next.completed?.ts).toBe(minuteBucketTs("2026-09-02T14:00:10.000Z"));
    expect(next.current.o).toBe(9);
    expect(next.current.ts).toBe(minuteBucketTs("2026-09-02T14:01:00.000Z"));
  });

  it("TC-006-02: coalesces tick snapshots to at most 4 batches per second", () => {
    const snaps = Array.from({ length: 15 }, (_, i) => ({ i }));
    const batches = coalesceQuoteBatches(snaps, 4);
    expect(batches.length).toBeLessThanOrEqual(4);
    expect(batches[batches.length - 1]?.i).toBe(14);
  });
});

describe("barsToUpsert normalization", () => {
  const instrumentId = "11111111-1111-4111-8111-111111111111";
  const barWriteKey = (bar: FeedBarWrite) => `${bar.instrument_id}|${bar.timeframe}|${bar.ts}`;

  it("merges duplicate bucket input with first o, max h, min l, last c, summed v", () => {
    const ts = minuteBucketTs("2026-09-02T14:00:10.000Z");
    const merged = normalizeBarsToUpsert([
      {
        instrument_id: instrumentId,
        timeframe: "1m",
        ts,
        o: 10,
        h: 12,
        l: 9,
        c: 11,
        v: 5,
      },
      {
        instrument_id: instrumentId,
        timeframe: "1m",
        ts,
        o: 99,
        h: 13,
        l: 8,
        c: 12,
        v: 3,
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual({
      instrument_id: instrumentId,
      timeframe: "1m",
      ts,
      o: 10,
      h: 13,
      l: 8,
      c: 12,
      v: 8,
    });
  });

  it("merges completed-roll and final-flush rows for the same bucket", () => {
    const ts = minuteBucketTs("2026-09-02T14:01:00.000Z");
    const merged = normalizeBarsToUpsert([
      {
        instrument_id: instrumentId,
        timeframe: "1m",
        ts,
        o: 100,
        h: 101.2,
        l: 99.5,
        c: 101,
        v: 500,
      },
      {
        instrument_id: instrumentId,
        timeframe: "1m",
        ts,
        o: 101,
        h: 101.5,
        l: 99.2,
        c: 100.8,
        v: 250,
      },
    ]);
    expect(new Set(merged.map(barWriteKey)).size).toBe(1);
    expect(merged[0]).toEqual({
      instrument_id: instrumentId,
      timeframe: "1m",
      ts,
      o: 100,
      h: 101.5,
      l: 99.2,
      c: 100.8,
      v: 750,
    });
  });

  it("returns unique keys and merged OHLCV when an invocation crosses a minute boundary", () => {
    const calendar = nyseTradingSessions(2026);
    const flags = parseFeedControls([
      { key: "feed.paused", value: false },
      { key: "feed.speed", value: 1 },
    ]);
    const instrument = {
      id: instrumentId,
      symbol: "AAPL",
      tick_size: 0.01,
      beta_class: "medium" as const,
      avg_volume: 1_000_000,
    };
    const bucket = minuteBucketTs("2026-09-02T14:00:50.000Z");
    const seedBar = {
      instrument_id: instrument.id,
      timeframe: "1m" as const,
      ts: bucket,
      o: 100,
      h: 101,
      l: 99,
      c: 100.5,
      v: 1_000,
    };
    const result = runFeedInvocation({
      nowIso: "2026-09-02T14:00:50.000Z",
      intervalSeconds: 20,
      calendar,
      flags,
      instruments: [instrument],
      quotes: [
        {
          instrument_id: instrument.id,
          bid: 211.99,
          ask: 212.01,
          last: 212,
          prev_close: 210,
          volume: 100,
          ts: "2026-09-02T14:00:50.000Z",
        },
      ],
      minuteBars: [seedBar],
      seed: HISTORY_SEED,
    });
    const keys = result.barsToUpsert.map(barWriteKey);
    expect(new Set(keys).size).toBe(keys.length);

    const completed = result.barsToUpsert.find((bar) => bar.ts === bucket);
    expect(completed).toBeDefined();
    expect(completed?.o).toBe(100);
    expect(completed?.h).toBeGreaterThanOrEqual(101);
    expect(completed?.l).toBeLessThanOrEqual(99);
    expect(completed?.v).toBeGreaterThan(1_000);

    const inProgress = result.barsToUpsert.find(
      (bar) => bar.ts === minuteBucketTs("2026-09-02T14:01:10.000Z"),
    );
    expect(inProgress).toBeDefined();
  });
});

describe("TC-006-01 / TC-006-03 feed controls", () => {
  const calendar = nyseTradingSessions(2026);
  const openTs = "2026-09-02T14:00:00.000Z";
  const instrument = {
    id: "11111111-1111-4111-8111-111111111111",
    symbol: "AAPL",
    tick_size: 0.01,
    beta_class: "medium" as const,
    avg_volume: 1_000_000,
  };
  const quote = {
    instrument_id: instrument.id,
    bid: 211.99,
    ask: 212.01,
    last: 212,
    prev_close: 210,
    volume: 100,
    ts: openTs,
  };

  it("TC-006-01: paused flag freezes quotes across a 10s batch", () => {
    const flags = parseFeedControls([
      { key: "feed.paused", value: true },
      { key: "feed.speed", value: 1 },
    ]);
    expect(flags.paused).toBe(true);
    const result = runFeedInvocation({
      nowIso: openTs,
      intervalSeconds: 10,
      calendar,
      flags,
      instruments: [instrument],
      quotes: [quote],
      minuteBars: [],
    });
    expect(result.quotes[0]?.last).toBe(212);
    expect(result.quotes[0]?.ts).toBe(openTs);
    expect(result.publishes).toEqual([]);
    expect(result.ticksApplied).toBe(0);
  });

  it("advances quotes while OPEN and leaves them unchanged while CLOSED", () => {
    const flags = parseFeedControls([
      { key: "feed.paused", value: false },
      { key: "feed.speed", value: 1 },
    ]);
    const openRun = runFeedInvocation({
      nowIso: openTs,
      intervalSeconds: 1,
      calendar,
      flags,
      instruments: [instrument],
      quotes: [quote],
      minuteBars: [],
    });
    expect(openRun.session).toBe("OPEN");
    expect(openRun.ticksApplied).toBe(1);
    expect(openRun.quotes[0]?.volume).toBeGreaterThan(quote.volume);
    expect(openRun.quotes[0]?.ts).not.toBe(openTs);

    const closedRun = runFeedInvocation({
      nowIso: "2026-09-02T20:30:00.000Z",
      intervalSeconds: 1,
      calendar,
      flags,
      instruments: [instrument],
      quotes: [quote],
      minuteBars: [],
    });
    expect(closedRun.session).toBe("CLOSED");
    expect(closedRun.quotes[0]?.last).toBe(212);
  });

  it("TC-006-03: force-price moves AAPL to 200.00 and is consumed", () => {
    const flags = parseFeedControls([
      { key: "feed.paused", value: true },
      { key: "feed.speed", value: 1 },
      { key: "feed.force_price", value: { symbol: "AAPL", price: 200 } },
    ]);
    const result = runFeedInvocation({
      nowIso: openTs,
      intervalSeconds: 1,
      calendar,
      flags,
      instruments: [instrument],
      quotes: [quote],
      minuteBars: [],
    });
    expect(result.quotes[0]?.last).toBe(200);
    expect(result.consumeForcePrice).toBe(true);
  });
});
