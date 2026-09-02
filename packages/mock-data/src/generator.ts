import type { MockInstrument } from "@meridian/schemas";
import {
  DAILY_BAR_COUNT,
  GBM_SESSIONS_PER_YEAR,
  HISTORY_SEED,
  INTRADAY_SESSION_COUNT,
  MINUTES_PER_SESSION,
  SESSION_END_DATE,
  dailyBarTs,
  minuteBarTs,
  tradingDaysEndingOn,
} from "./calendar";
import { gaussian, hashSymbolSeed, mulberry32 } from "./rng";
import { annualSigma, simParamsForBeta } from "./sim-params";

export type OhlcvBar = {
  timeframe: "1m" | "1d";
  ts: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type InstrumentHistory = {
  daily: OhlcvBar[];
  minutes: OhlcvBar[];
};

export type GenerateHistoryOptions = {
  seed?: number;
  dailyCount?: number;
  intradayDays?: number;
  minutesPerSession?: number;
  sessionEndDate?: string;
};

export function roundToTick(price: number, tickSize: number): number {
  if (tickSize <= 0) {
    throw new Error("TICK_SIZE_POSITIVE");
  }
  const n = Math.round(price / tickSize);
  return Number((n * tickSize).toFixed(10));
}

export function enforceOhlc(
  o: number,
  h: number,
  l: number,
  c: number,
  tickSize: number,
): { o: number; h: number; l: number; c: number } {
  let open = roundToTick(o, tickSize);
  let high = roundToTick(h, tickSize);
  let low = roundToTick(l, tickSize);
  let close = roundToTick(c, tickSize);
  const minOc = Math.min(open, close);
  const maxOc = Math.max(open, close);
  if (low > minOc) {
    low = minOc;
  }
  if (high < maxOc) {
    high = maxOc;
  }
  if (low <= 0) {
    low = tickSize;
  }
  if (open < low) {
    open = low;
  }
  if (close < low) {
    close = low;
  }
  if (open > high) {
    open = high;
  }
  if (close > high) {
    close = high;
  }
  return { o: open, h: high, l: low, c: close };
}

function assertOhlc(bar: OhlcvBar): void {
  if (!(bar.l <= Math.min(bar.o, bar.c) && Math.max(bar.o, bar.c) <= bar.h)) {
    throw new Error("OHLC_INVARIANT");
  }
}

function brownianBridge(start: number, end: number, steps: number, rng: () => number): number[] {
  const path: number[] = [0];
  let w = 0;
  for (let i = 1; i <= steps; i += 1) {
    w += gaussian(rng) * Math.sqrt(1 / steps);
    path.push(w);
  }
  const wT = path[steps] ?? 0;
  const out: number[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const wi = path[i] ?? 0;
    out.push(start + (end - start) * t + (wi - t * wT));
  }
  return out;
}

function splitVolume(total: number, parts: number, rng: () => number): number[] {
  const weights: number[] = [];
  let sum = 0;
  for (let i = 0; i < parts; i += 1) {
    const w = Math.exp(gaussian(rng) * 0.35);
    weights.push(w);
    sum += w;
  }
  const vols = weights.map((w) => Math.max(1, Math.round((total * w) / sum)));
  let acc = vols.reduce((a, b) => a + b, 0);
  const last = parts - 1;
  const lastVal = vols[last] ?? 1;
  vols[last] = Math.max(1, lastVal + (total - acc));
  acc = vols.reduce((a, b) => a + b, 0);
  if (acc !== total && last >= 0) {
    vols[last] = Math.max(1, (vols[last] ?? 1) + (total - acc));
  }
  return vols;
}

function generateMinuteBars(
  daily: OhlcvBar,
  isoDate: string,
  rng: () => number,
  tickSize: number,
  minutes: number,
): OhlcvBar[] {
  const path = brownianBridge(daily.o, daily.c, minutes, rng);
  const lo = daily.l;
  const hi = daily.h;
  for (let i = 0; i < path.length; i += 1) {
    const p = path[i];
    if (p === undefined) {
      continue;
    }
    path[i] = Math.min(hi, Math.max(lo, p));
  }
  path[0] = daily.o;
  path[minutes] = daily.c;

  let idxLow = 1;
  let idxHigh = Math.min(2, minutes - 1);
  let minSeen = Number.POSITIVE_INFINITY;
  let maxSeen = Number.NEGATIVE_INFINITY;
  for (let i = 1; i < minutes; i += 1) {
    const p = path[i] ?? daily.o;
    if (p < minSeen) {
      minSeen = p;
      idxLow = i;
    }
    if (p > maxSeen) {
      maxSeen = p;
      idxHigh = i;
    }
  }
  if (idxLow === idxHigh) {
    idxHigh = idxLow >= minutes - 1 ? idxLow - 1 : idxLow + 1;
  }
  path[idxLow] = lo;
  path[idxHigh] = hi;

  const vols = splitVolume(daily.v, minutes, rng);
  const bars: OhlcvBar[] = [];
  for (let i = 0; i < minutes; i += 1) {
    const rawO = i === 0 ? daily.o : (path[i] ?? daily.o);
    const rawC = i === minutes - 1 ? daily.c : (path[i + 1] ?? daily.c);
    let h = Math.max(rawO, rawC);
    let l = Math.min(rawO, rawC);
    if (i === idxLow || i + 1 === idxLow) {
      l = lo;
    }
    if (i === idxHigh || i + 1 === idxHigh) {
      h = hi;
    }
    const ohlc = enforceOhlc(rawO, h, l, rawC, tickSize);
    bars.push({
      timeframe: "1m",
      ts: minuteBarTs(isoDate, i),
      ...ohlc,
      v: vols[i] ?? 1,
    });
  }

  const stamp = (index: number, patch: { o?: number; h?: number; l?: number; c?: number }) => {
    const current = bars[index];
    if (!current) {
      return;
    }
    bars[index] = {
      ...current,
      ...enforceOhlc(
        patch.o ?? current.o,
        patch.h ?? current.h,
        patch.l ?? current.l,
        patch.c ?? current.c,
        tickSize,
      ),
    };
  };
  stamp(0, { o: daily.o });
  stamp(minutes - 1, { c: daily.c });
  stamp(Math.min(idxLow, minutes - 1), { l: lo });
  stamp(Math.min(idxHigh, minutes - 1), { h: hi });

  for (const bar of bars) {
    assertOhlc(bar);
  }
  return bars;
}

export function generateInstrumentHistory(
  instrument: MockInstrument,
  options: GenerateHistoryOptions = {},
): InstrumentHistory {
  const seed = options.seed ?? HISTORY_SEED;
  const dailyCount = options.dailyCount ?? DAILY_BAR_COUNT;
  const intradayDays = options.intradayDays ?? INTRADAY_SESSION_COUNT;
  const minutes = options.minutesPerSession ?? MINUTES_PER_SESSION;
  const sessionEnd = options.sessionEndDate ?? SESSION_END_DATE;
  const days = tradingDaysEndingOn(sessionEnd, dailyCount);
  const rng = mulberry32(hashSymbolSeed(instrument.symbol, seed));
  const sim = simParamsForBeta(instrument.beta_class);
  const sigma = annualSigma(instrument.beta_class);
  const dt = 1 / GBM_SESSIONS_PER_YEAR;
  const mu = 0.06 + 0.08 * gaussian(rng);
  const tick = instrument.tick_size;
  const gapLo = sim.gapRangePct[0];
  const gapHi = sim.gapRangePct[1];

  const relCloses: number[] = [];
  let s = 1;
  for (let i = 0; i < dailyCount; i += 1) {
    const z = gaussian(rng);
    s *= Math.exp((mu - (sigma * sigma) / 2) * dt + sigma * Math.sqrt(dt) * z);
    relCloses.push(s);
  }
  const lastRel = relCloses[dailyCount - 1];
  if (lastRel === undefined || lastRel === 0) {
    throw new Error("GBM_EMPTY");
  }
  const scale = instrument.base_price / lastRel;
  const closes = relCloses.map((x) => x * scale);

  const daily: OhlcvBar[] = [];
  for (let i = 0; i < dailyCount; i += 1) {
    const close = closes[i] ?? instrument.base_price;
    const prevClose =
      i === 0 ? close / Math.exp((mu - (sigma * sigma) / 2) * dt) : (closes[i - 1] ?? close);
    let gap = 1;
    if (rng() < sim.gapEventProbPerDay) {
      const mag = (gapLo + rng() * (gapHi - gapLo)) / 100;
      gap = 1 + (rng() < 0.5 ? -1 : 1) * mag;
    }
    const open = prevClose * gap;
    const extra = Math.abs(gaussian(rng)) * sigma * Math.sqrt(dt) * close;
    const high = Math.max(open, close) + extra;
    const low = Math.max(tick, Math.min(open, close) - extra);
    const ret = (close - prevClose) / prevClose;
    const zRet = ret / (sigma * Math.sqrt(dt) || 1);
    const vol = Math.max(
      1,
      Math.round(
        Math.exp(Math.log(instrument.avg_volume) + 0.3 * gaussian(rng)) * (1 + 2 * Math.abs(zRet)),
      ),
    );
    const iso = days[i];
    if (!iso) {
      throw new Error("CALENDAR_SHORT");
    }
    const ohlc = enforceOhlc(open, high, low, close, tick);
    const bar: OhlcvBar = {
      timeframe: "1d",
      ts: dailyBarTs(iso),
      ...ohlc,
      v: vol,
    };
    if (i === dailyCount - 1) {
      const target = roundToTick(instrument.base_price, tick);
      const anchored = enforceOhlc(
        bar.o,
        Math.max(bar.h, target),
        Math.min(bar.l, target),
        target,
        tick,
      );
      daily.push({ ...bar, ...anchored });
    } else {
      daily.push(bar);
    }
    assertOhlc(daily[i] ?? bar);
  }

  const minutesOut: OhlcvBar[] = [];
  const startIntraday = Math.max(0, dailyCount - intradayDays);
  for (let i = startIntraday; i < dailyCount; i += 1) {
    const bar = daily[i];
    const iso = days[i];
    if (!bar || !iso) {
      throw new Error("INTRADAY_MISSING_DAILY");
    }
    minutesOut.push(...generateMinuteBars(bar, iso, rng, tick, minutes));
  }

  return { daily, minutes: minutesOut };
}

export function quoteFromHistory(
  history: InstrumentHistory,
  tickSize: number,
): {
  bid: number;
  ask: number;
  last: number;
  prev_close: number;
  volume: number;
  ts: string;
} {
  const lastDaily = history.daily[history.daily.length - 1];
  const prevDaily = history.daily[history.daily.length - 2] ?? lastDaily;
  if (!lastDaily || !prevDaily) {
    throw new Error("QUOTE_NEEDS_DAILY");
  }
  const lastMinute = history.minutes[history.minutes.length - 1];
  const last = lastDaily.c;
  const bid = roundToTick(Math.max(tickSize, last - tickSize), tickSize);
  const ask = roundToTick(last + tickSize, tickSize);
  return {
    bid: Math.min(bid, last),
    ask: Math.max(ask, last),
    last,
    prev_close: prevDaily.c,
    volume: lastDaily.v,
    ts: lastMinute?.ts ?? lastDaily.ts,
  };
}
