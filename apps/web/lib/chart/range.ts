import type { ChartRange, MarketBar } from "@meridian/schemas";

export const CHART_RANGES: readonly ChartRange[] = ["1D", "1W", "1M", "1Y", "5Y"];

export function timeframeForRange(range: ChartRange): "1m" | "1d" {
  return range === "1D" ? "1m" : "1d";
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Display lookback windows (not policy). Clock is injected. */
export function tsCutoffIso(range: ChartRange, now: Date): string {
  const ms =
    range === "1D"
      ? 36 * HOUR_MS
      : range === "1W"
        ? 7 * DAY_MS
        : range === "1M"
          ? 31 * DAY_MS
          : range === "1Y"
            ? 366 * DAY_MS
            : 5 * 365 * DAY_MS;
  return new Date(now.getTime() - ms).toISOString();
}

export function candleBucketStart(ts: string, timeframe: "1m" | "1d"): string {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) {
    return ts;
  }
  if (timeframe === "1d") {
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString();
  }
  date.setUTCSeconds(0, 0);
  date.setUTCMilliseconds(0);
  return date.toISOString();
}

export type QuoteForCandle = {
  instrument_id: string;
  last: number;
  volume: number;
  ts: string;
};

export function applyQuoteToCandles(
  bars: readonly MarketBar[],
  quote: QuoteForCandle,
): MarketBar[] {
  if (bars.length === 0) {
    const ts = candleBucketStart(quote.ts, "1m");
    return [
      {
        instrument_id: quote.instrument_id,
        timeframe: "1m",
        ts,
        o: quote.last,
        h: quote.last,
        l: quote.last,
        c: quote.last,
        v: quote.volume,
      },
    ];
  }
  const last = bars[bars.length - 1];
  if (!last) {
    return [...bars];
  }
  const timeframe = last.timeframe;
  const tickBucket = candleBucketStart(quote.ts, timeframe);
  const lastBucket = candleBucketStart(last.ts, timeframe);
  if (tickBucket < lastBucket) {
    const next: MarketBar = {
      ...last,
      h: Math.max(last.h, quote.last),
      l: Math.min(last.l, quote.last),
      c: quote.last,
    };
    return [...bars.slice(0, -1), next];
  }
  if (tickBucket === lastBucket) {
    const next: MarketBar = {
      ...last,
      h: Math.max(last.h, quote.last),
      l: Math.min(last.l, quote.last),
      c: quote.last,
    };
    return [...bars.slice(0, -1), next];
  }
  const appended: MarketBar = {
    instrument_id: last.instrument_id,
    timeframe,
    ts: tickBucket,
    o: quote.last,
    h: quote.last,
    l: quote.last,
    c: quote.last,
    v: 0,
  };
  return [...bars, appended];
}
