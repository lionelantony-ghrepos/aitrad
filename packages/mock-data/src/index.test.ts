import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DAILY_BAR_COUNT,
  HISTORY_SEED,
  INTRADAY_SESSION_COUNT,
  MINUTES_PER_SESSION,
  SESSION_END_DATE,
  evaluateSeedCounts,
  generateInstrumentHistory,
  parseInstrumentsJson,
  tradingDaysEndingOn,
} from "./index";

const universePath = path.join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../mock_data/instruments.json",
);

function loadUniverse() {
  return parseInstrumentsJson(JSON.parse(readFileSync(universePath, "utf8")) as unknown);
}

function assertOhlc(bar: { o: number; h: number; l: number; c: number }) {
  expect(bar.l).toBeLessThanOrEqual(Math.min(bar.o, bar.c));
  expect(Math.max(bar.o, bar.c)).toBeLessThanOrEqual(bar.h);
}

describe("AC-005-01 instrument universe", () => {
  it("loads 150 unique fully populated symbols from mock_data/instruments.json", () => {
    const rows = loadUniverse();
    expect(rows).toHaveLength(150);
    const symbols = new Set(rows.map((r) => r.symbol));
    expect(symbols.size).toBe(150);
    for (const row of rows) {
      expect(row.name.length).toBeGreaterThan(0);
      expect(row.exchange.length).toBeGreaterThan(0);
      expect(row.sector.length).toBeGreaterThan(0);
      expect(row.industry.length).toBeGreaterThan(0);
      expect(row.tick_size).toBeGreaterThan(0);
      expect(row.lot_size).toBeGreaterThan(0);
      expect(row.avg_volume).toBeGreaterThan(0);
      expect(row.base_price).toBeGreaterThan(0);
    }
  });
});

describe("calendar", () => {
  it("returns the requested number of NYSE sessions ending on the seed date", () => {
    const days = tradingDaysEndingOn(SESSION_END_DATE, DAILY_BAR_COUNT);
    expect(days).toHaveLength(DAILY_BAR_COUNT);
    expect(days[days.length - 1]).toBe(SESSION_END_DATE);
    expect(new Set(days).size).toBe(DAILY_BAR_COUNT);
  });
});

describe("AC-005-02 / TC-005-02 GBM history", () => {
  const aapl = () => loadUniverse().find((r) => r.symbol === "AAPL");

  it("emits >=1250 daily bars and 1950 1m bars with OHLC invariants (AC-005-02)", () => {
    const instrument = aapl();
    expect(instrument).toBeDefined();
    if (!instrument) {
      return;
    }
    const history = generateInstrumentHistory(instrument);
    expect(history.daily.length).toBeGreaterThanOrEqual(1250);
    expect(history.daily).toHaveLength(DAILY_BAR_COUNT);
    expect(history.minutes).toHaveLength(INTRADAY_SESSION_COUNT * MINUTES_PER_SESSION);
    for (const bar of history.daily) {
      assertOhlc(bar);
    }
    for (const bar of history.minutes) {
      assertOhlc(bar);
    }
    const last = history.daily[history.daily.length - 1];
    expect(last?.c).toBeCloseTo(instrument.base_price, 1);
  });

  it("TC-005-02: seed 42 twice is deep-equal", () => {
    const instrument = aapl();
    expect(instrument).toBeDefined();
    if (!instrument) {
      return;
    }
    const a = generateInstrumentHistory(instrument, { seed: HISTORY_SEED, dailyCount: 40 });
    const b = generateInstrumentHistory(instrument, { seed: HISTORY_SEED, dailyCount: 40 });
    expect(a).toEqual(b);
  });

  it("changes output when the seed changes", () => {
    const instrument = aapl();
    expect(instrument).toBeDefined();
    if (!instrument) {
      return;
    }
    const a = generateInstrumentHistory(instrument, { seed: 42, dailyCount: 20 });
    const b = generateInstrumentHistory(instrument, { seed: 43, dailyCount: 20 });
    expect(a).not.toEqual(b);
  });

  it("1m path endpoints match the parent daily bar after tick rounding", () => {
    const instrument = aapl();
    expect(instrument).toBeDefined();
    if (!instrument) {
      return;
    }
    const history = generateInstrumentHistory(instrument, { dailyCount: 8, intradayDays: 1 });
    const day = history.daily[history.daily.length - 1];
    const first = history.minutes[0];
    const last = history.minutes[history.minutes.length - 1];
    expect(day).toBeDefined();
    expect(first?.o).toBe(day?.o);
    expect(last?.c).toBe(day?.c);
    expect(Math.min(...history.minutes.map((b) => b.l))).toBe(day?.l);
    expect(Math.max(...history.minutes.map((b) => b.h))).toBe(day?.h);
    expect(history.minutes.reduce((s, b) => s + b.v, 0)).toBe(day?.v);
  });
});

describe("TC-005-01 count gate", () => {
  it("accepts the post-seed expectations from doc 06", () => {
    const result = evaluateSeedCounts({
      instruments: 150,
      dailyBars: 150 * 1255,
      minuteBars: 292_500,
      quotes: 150,
      minDailyPerInstrument: 1255,
      minMinutePerInstrument: 1950,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a short universe", () => {
    const result = evaluateSeedCounts({
      instruments: 149,
      dailyBars: 0,
      minuteBars: 0,
      quotes: 0,
      minDailyPerInstrument: 0,
      minMinutePerInstrument: 0,
    });
    expect(result.ok).toBe(false);
  });
});
