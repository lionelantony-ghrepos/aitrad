import type { BetaClass } from "@meridian/schemas";
import {
  GBM_SESSIONS_PER_YEAR,
  MINUTES_PER_SESSION,
  lookupSession,
  nyClockParts,
  nyseSessionState,
  type MarketCalendarRow,
} from "./calendar";
import { enforceOhlc, roundToTick, type OhlcvBar } from "./generator";
import { gaussian, hashSymbolSeed, mulberry32 } from "./rng";
import { annualSigma, simParamsForBeta } from "./sim-params";

/** Architecture §9 coalescing cap (not a decision-table cell). */
export const MAX_QUOTE_BATCHES_PER_SEC = 4;

export type GbmStepInput = {
  last: number;
  tickSize: number;
  betaClass: BetaClass;
  symbol: string;
  simEpochSec: number;
  seed?: number;
  sessionOpen: boolean;
  sessionOpenStart: boolean;
};

export type GbmStepResult = {
  last: number;
  appliedGap: boolean;
};

export function stepGbmPrice(input: GbmStepInput): GbmStepResult {
  const seed = input.seed ?? 42;
  const last = roundToTick(Math.max(input.tickSize, input.last), input.tickSize);
  if (!input.sessionOpen) {
    return { last, appliedGap: false };
  }
  let price = last;
  let appliedGap = false;
  const sim = simParamsForBeta(input.betaClass);
  if (input.sessionOpenStart) {
    const dayId = Math.floor(input.simEpochSec / 86400);
    const gapRng = mulberry32(hashSymbolSeed(`${input.symbol}:gap:${dayId}`, seed));
    if (gapRng() < sim.gapEventProbPerDay) {
      const lo = sim.gapRangePct[0];
      const hi = sim.gapRangePct[1];
      const mag = (lo + gapRng() * (hi - lo)) / 100;
      const sign = gapRng() < 0.5 ? -1 : 1;
      price *= 1 + sign * mag;
      appliedGap = true;
    }
  }
  const sigma = annualSigma(input.betaClass);
  const dt = 1 / (GBM_SESSIONS_PER_YEAR * MINUTES_PER_SESSION * 60);
  const muRng = mulberry32(hashSymbolSeed(`${input.symbol}:mu`, seed));
  const mu = 0.06 + 0.08 * gaussian(muRng);
  const zRng = mulberry32(hashSymbolSeed(`${input.symbol}:z:${input.simEpochSec}`, seed));
  const z = gaussian(zRng);
  price *= Math.exp((mu - (sigma * sigma) / 2) * dt + sigma * Math.sqrt(dt) * z);
  return { last: roundToTick(Math.max(input.tickSize, price), input.tickSize), appliedGap };
}

export function minuteBucketTs(iso: string): string {
  const d = new Date(iso);
  d.setUTCSeconds(0, 0);
  return d.toISOString();
}

export type MinuteTick = {
  last: number;
  volumeDelta: number;
  ts: string;
  tickSize: number;
};

export type MinuteRoll = {
  completed: OhlcvBar | null;
  current: OhlcvBar;
};

export function rollMinuteBar(current: OhlcvBar | null, tick: MinuteTick): MinuteRoll {
  const bucket = minuteBucketTs(tick.ts);
  const startBar = (open: number, ts: string): OhlcvBar => {
    const ohlc = enforceOhlc(open, open, open, open, tick.tickSize);
    return {
      timeframe: "1m",
      ts,
      ...ohlc,
      v: tick.volumeDelta,
    };
  };
  if (!current) {
    return { completed: null, current: startBar(tick.last, bucket) };
  }
  if (current.ts !== bucket) {
    return { completed: current, current: startBar(tick.last, bucket) };
  }
  const ohlc = enforceOhlc(
    current.o,
    Math.max(current.h, tick.last),
    Math.min(current.l, tick.last),
    tick.last,
    tick.tickSize,
  );
  return {
    completed: null,
    current: { ...current, ...ohlc, v: current.v + tick.volumeDelta },
  };
}

export function coalesceQuoteBatches<T>(
  items: readonly T[],
  maxPerSec = MAX_QUOTE_BATCHES_PER_SEC,
): T[] {
  if (items.length <= maxPerSec) {
    return [...items];
  }
  if (maxPerSec <= 1) {
    return items.length === 0 ? [] : [items[items.length - 1] as T];
  }
  const out: T[] = [];
  let prev = -1;
  for (let i = 0; i < maxPerSec; i += 1) {
    const idx = Math.round((i * (items.length - 1)) / (maxPerSec - 1));
    if (idx === prev) {
      continue;
    }
    const item = items[idx];
    if (item !== undefined) {
      out.push(item);
      prev = idx;
    }
  }
  return out;
}

export type FeedFlagRow = { key: string; value: unknown };

export type ForcePrice = { symbol: string; price: number };

export type FeedControls = {
  paused: boolean;
  speed: number;
  forcePrice: ForcePrice | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function parsePaused(value: unknown): boolean {
  if (value === true || value === "true") {
    return true;
  }
  const rec = asRecord(value);
  if (rec && "paused" in rec) {
    return rec.paused === true || rec.paused === "true";
  }
  return false;
}

function parseSpeed(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  const rec = asRecord(value);
  if (rec && typeof rec.speed === "number" && Number.isFinite(rec.speed)) {
    return rec.speed;
  }
  return undefined;
}

function parseForce(value: unknown): ForcePrice | null {
  const rec = asRecord(value);
  if (!rec) {
    return null;
  }
  const symbol = rec.symbol;
  const price = rec.price;
  if (typeof symbol === "string" && price !== undefined && Number.isFinite(Number(price))) {
    return { symbol, price: Number(price) };
  }
  return null;
}

export function parseFeedControls(rows: readonly FeedFlagRow[]): FeedControls {
  let paused = false;
  let speed = 1;
  let forcePrice: ForcePrice | null = null;
  for (const row of rows) {
    if (row.key === "feed.paused") {
      paused = parsePaused(row.value);
    } else if (row.key === "feed.speed") {
      const parsed = parseSpeed(row.value);
      if (parsed !== undefined) {
        speed = parsed;
      }
    } else if (row.key === "feed.force_price") {
      forcePrice = parseForce(row.value);
    }
  }
  return { paused, speed, forcePrice };
}

export type FeedInstrument = {
  id: string;
  symbol: string;
  tick_size: number;
  beta_class: BetaClass;
  avg_volume: number;
};

export type FeedQuote = {
  instrument_id: string;
  bid: number;
  ask: number;
  last: number;
  prev_close: number;
  volume: number;
  ts: string;
};

export type FeedMinuteBar = OhlcvBar & { instrument_id: string };

export type FeedInvocationInput = {
  nowIso: string;
  intervalSeconds: number;
  calendar: readonly MarketCalendarRow[];
  flags: FeedControls;
  instruments: readonly FeedInstrument[];
  quotes: readonly FeedQuote[];
  minuteBars: readonly FeedMinuteBar[];
  seed?: number;
};

export type FeedBarWrite = OhlcvBar & { instrument_id: string };

function barWriteKey(bar: FeedBarWrite): string {
  return `${bar.instrument_id}\x1f${bar.timeframe}\x1f${bar.ts}`;
}

export function mergeBarWrites(first: FeedBarWrite, next: FeedBarWrite): FeedBarWrite {
  return {
    instrument_id: first.instrument_id,
    timeframe: first.timeframe,
    ts: first.ts,
    o: first.o,
    h: Math.max(first.h, next.h),
    l: Math.min(first.l, next.l),
    c: next.c,
    v: first.v + next.v,
  };
}

/** One row per (instrument_id, timeframe, ts): first o, max h, min l, last c, summed v. */
export function normalizeBarsToUpsert(bars: readonly FeedBarWrite[]): FeedBarWrite[] {
  const order: string[] = [];
  const byKey = new Map<string, FeedBarWrite>();
  for (const bar of bars) {
    const key = barWriteKey(bar);
    const prior = byKey.get(key);
    if (prior === undefined) {
      order.push(key);
      byKey.set(key, { ...bar });
    } else {
      byKey.set(key, mergeBarWrites(prior, bar));
    }
  }
  return order.map((key) => byKey.get(key) as FeedBarWrite);
}

export type FeedInvocationResult = {
  session: "OPEN" | "CLOSED";
  ticksApplied: number;
  quotes: FeedQuote[];
  barsToUpsert: FeedBarWrite[];
  publishes: FeedQuote[][];
  consumeForcePrice: boolean;
};

function spreadQuote(
  last: number,
  tickSize: number,
  volume: number,
  ts: string,
  prevClose: number,
): FeedQuote {
  const rounded = roundToTick(Math.max(tickSize, last), tickSize);
  const bid = roundToTick(Math.max(tickSize, rounded - tickSize), tickSize);
  const ask = roundToTick(rounded + tickSize, tickSize);
  return {
    instrument_id: "",
    bid: Math.min(bid, rounded),
    ask: Math.max(ask, rounded),
    last: rounded,
    prev_close: prevClose,
    volume,
    ts,
  };
}

function volumePerSecond(avgVolume: number, sessionMinutes: number): number {
  const seconds = Math.max(1, sessionMinutes * 60);
  return Math.max(1, Math.round(avgVolume / seconds));
}

export function runFeedInvocation(input: FeedInvocationInput): FeedInvocationResult {
  const seed = input.seed ?? 42;
  const now = new Date(input.nowIso);
  const session = nyseSessionState(now, input.calendar);
  const byId = new Map(input.quotes.map((q) => [q.instrument_id, { ...q }]));

  const currentBar = new Map<string, OhlcvBar>();
  for (const bar of input.minuteBars) {
    currentBar.set(bar.instrument_id, {
      timeframe: bar.timeframe,
      ts: bar.ts,
      o: bar.o,
      h: bar.h,
      l: bar.l,
      c: bar.c,
      v: bar.v,
    });
  }

  let consumeForcePrice = false;
  if (input.flags.forcePrice) {
    consumeForcePrice = true;
    const target = input.instruments.find((i) => i.symbol === input.flags.forcePrice?.symbol);
    if (target) {
      const q = byId.get(target.id);
      if (q) {
        const next = spreadQuote(
          input.flags.forcePrice.price,
          target.tick_size,
          q.volume,
          q.ts,
          q.prev_close,
        );
        next.instrument_id = q.instrument_id;
        byId.set(target.id, next);
      }
    }
  }

  const ticks =
    input.flags.paused || input.flags.speed <= 0
      ? 0
      : Math.max(0, Math.round(input.flags.speed * input.intervalSeconds));

  const snapshots: FeedQuote[][] = [];
  const barsToUpsert: FeedBarWrite[] = [];

  for (let k = 0; k < ticks; k += 1) {
    const sim = new Date(now.getTime() + (k + 1) * 1000);
    const simIso = sim.toISOString();
    const open = nyseSessionState(sim, input.calendar) === "OPEN";
    const prev = nyseSessionState(new Date(sim.getTime() - 1000), input.calendar) === "OPEN";
    const sessionOpenStart = open && !prev;
    const partsDate = lookupSession(nyClockParts(sim).dateKey, input.calendar);
    const sessionMinutes = partsDate
      ? partsDate.close_minute - partsDate.open_minute
      : MINUTES_PER_SESSION;

    for (const inst of input.instruments) {
      const q = byId.get(inst.id);
      if (!q) {
        continue;
      }
      const stepped = stepGbmPrice({
        last: q.last,
        tickSize: inst.tick_size,
        betaClass: inst.beta_class,
        symbol: inst.symbol,
        simEpochSec: Math.floor(sim.getTime() / 1000),
        seed,
        sessionOpen: open,
        sessionOpenStart,
      });
      const volDelta = open ? volumePerSecond(inst.avg_volume, sessionMinutes) : 0;
      const next = spreadQuote(
        stepped.last,
        inst.tick_size,
        q.volume + volDelta,
        simIso,
        q.prev_close,
      );
      next.instrument_id = q.instrument_id;
      byId.set(inst.id, next);
      if (open) {
        const rolled = rollMinuteBar(currentBar.get(inst.id) ?? null, {
          last: next.last,
          volumeDelta: volDelta,
          ts: simIso,
          tickSize: inst.tick_size,
        });
        if (rolled.completed) {
          barsToUpsert.push({ ...rolled.completed, instrument_id: inst.id });
        }
        currentBar.set(inst.id, rolled.current);
      }
    }
    snapshots.push([...byId.values()].map((q) => ({ ...q })));
  }

  for (const [instrumentId, bar] of currentBar) {
    barsToUpsert.push({ ...bar, instrument_id: instrumentId });
  }

  const quotesOut = [...byId.values()];
  let publishes: FeedQuote[][] = [];
  if (ticks > 0 && session === "OPEN") {
    publishes = coalesceQuoteBatches(snapshots, MAX_QUOTE_BATCHES_PER_SEC);
  } else if (consumeForcePrice && ticks === 0) {
    publishes = [quotesOut.map((q) => ({ ...q }))];
  }

  return {
    session,
    ticksApplied: ticks,
    quotes: quotesOut,
    barsToUpsert: normalizeBarsToUpsert(barsToUpsert),
    publishes,
    consumeForcePrice,
  };
}
