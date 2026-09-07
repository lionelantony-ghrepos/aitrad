export const EXPECTED_INSTRUMENTS = 150;
export const MIN_DAILY_BARS_PER_INSTRUMENT = 1250;
export const MINUTE_BARS_PER_INSTRUMENT = 1950;
export const EXPECTED_MINUTE_BARS_TOTAL = EXPECTED_INSTRUMENTS * MINUTE_BARS_PER_INSTRUMENT;

export type SeedCounts = {
  instruments: number;
  dailyBars: number;
  minuteBars: number;
  quotes: number;
  minDailyPerInstrument: number;
  minMinutePerInstrument: number;
};

export function evaluateSeedCounts(counts: SeedCounts): { ok: boolean; lines: string[] } {
  const lines: string[] = [
    `instruments ${counts.instruments} (expected ${EXPECTED_INSTRUMENTS})`,
    `daily_bars ${counts.dailyBars} (expected >= ${EXPECTED_INSTRUMENTS * MIN_DAILY_BARS_PER_INSTRUMENT})`,
    `minute_bars ${counts.minuteBars} (expected ${EXPECTED_MINUTE_BARS_TOTAL})`,
    `quotes_latest ${counts.quotes} (expected ${EXPECTED_INSTRUMENTS})`,
    `min_daily_per_instrument ${counts.minDailyPerInstrument} (expected >= ${MIN_DAILY_BARS_PER_INSTRUMENT})`,
    `min_1m_per_instrument ${counts.minMinutePerInstrument} (expected ${MINUTE_BARS_PER_INSTRUMENT})`,
  ];
  const ok =
    counts.instruments === EXPECTED_INSTRUMENTS &&
    counts.dailyBars >= EXPECTED_INSTRUMENTS * MIN_DAILY_BARS_PER_INSTRUMENT &&
    counts.minuteBars === EXPECTED_MINUTE_BARS_TOTAL &&
    counts.quotes === EXPECTED_INSTRUMENTS &&
    counts.minDailyPerInstrument >= MIN_DAILY_BARS_PER_INSTRUMENT &&
    counts.minMinutePerInstrument === MINUTE_BARS_PER_INSTRUMENT;
  return { ok, lines };
}

export const SEED_COUNT_SQL = `
SELECT
  (SELECT COUNT(*)::int FROM public.instruments) AS instruments,
  (SELECT COUNT(*)::int FROM public.market_bars WHERE timeframe = '1d') AS daily_bars,
  (SELECT COUNT(*)::int FROM public.market_bars WHERE timeframe = '1m') AS minute_bars,
  (SELECT COUNT(*)::int FROM public.quotes_latest) AS quotes,
  COALESCE((SELECT MIN(cnt)::int FROM (
    SELECT COUNT(*) AS cnt FROM public.market_bars WHERE timeframe = '1d' GROUP BY instrument_id
  ) d), 0) AS min_daily_per_instrument,
  COALESCE((SELECT MIN(cnt)::int FROM (
    SELECT COUNT(*) AS cnt FROM public.market_bars WHERE timeframe = '1m' GROUP BY instrument_id
  ) m), 0) AS min_minute_per_instrument
`.trim();
