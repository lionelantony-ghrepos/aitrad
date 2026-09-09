import type {
  MarketCapBand,
  MockInstrument,
  NewsEventType,
  NewsItem,
  NewsTemplatesFile,
} from "@meridian/schemas";
import { newsTemplatesFileSchema } from "@meridian/schemas";
import { HISTORY_SEED } from "./calendar";
import { hashSymbolSeed, mulberry32 } from "./rng";
import { newsSentimentDriftNudgeBps } from "./sim-params";

/** Doc 06: 500 items over the past 30 days at seed. */
export const NEWS_BACKFILL_COUNT = 500;
export const NEWS_BACKFILL_DAYS = 30;
/** Doc 06: live 1–5 items per simulated 5 minutes. */
export const NEWS_LIVE_WINDOW_SEC = 300;
export const NEWS_LIVE_MIN_ITEMS = 1;
export const NEWS_LIVE_MAX_ITEMS = 5;

const EVENT_WEIGHTS: readonly { type: NewsEventType; weight: number }[] = [
  { type: "analyst", weight: 0.3 },
  { type: "earnings", weight: 0.2 },
  { type: "macro", weight: 0.2 },
  { type: "product", weight: 0.15 },
  { type: "regulatory", weight: 0.1 },
  { type: "mna", weight: 0.05 },
];

const CAP_WEIGHTS: Record<MarketCapBand, number> = {
  mega: 8,
  large: 4,
  mid: 2,
  small: 1,
  micro: 0.5,
};

const SOURCES = ["Reuters", "Bloomberg", "WSJ", "CNBC", "AP"] as const;

const BODY_LINES: Record<NewsEventType, readonly string[]> = {
  earnings: [
    "Management highlighted {segment} as the primary swing factor.",
    "Street models now imply a {pct}% revision path into the next print.",
    "The result lands against a busy {sector} reporting calendar.",
  ],
  analyst: [
    "The note cites {concern} as the key debate versus consensus.",
    "{bank} frames risk/reward as balanced near ${target}.",
    "Positioning in {sector} names may shift after the call.",
  ],
  product: [
    "Early demand checks in {market} will set the near-term narrative.",
    "Rivals in {sector} are watching execution on {product}.",
    "Investors will parse commentary on {segment} attach rates.",
  ],
  macro: [
    "Rates traders marked the {stance} path into the next session.",
    "{sector} factor baskets {direction} as yields {yielddir}.",
    "Futures {futdir} after the inflation print came in {inflation}.",
  ],
  regulatory: [
    "Counsel said the {agency} process remains at an early stage.",
    "The {issue} docket has been a lingering {sector} overhang.",
    "A timeline for the next filing was not specified.",
  ],
  mna: [
    "Advisors put the cash-and-stock mix as still in flux.",
    "The {targetco} asset would expand {company} in {segment}.",
    "Antitrust review is the next gating item for the ${dealsize}B package.",
  ],
};

export function parseNewsTemplatesJson(raw: unknown): NewsTemplatesFile {
  return newsTemplatesFileSchema.parse(raw);
}

function requireItem<T>(item: T | undefined, code: string): T {
  if (item === undefined) {
    throw new Error(code);
  }
  return item;
}

function pickWeighted<T>(rng: () => number, items: readonly { item: T; weight: number }[]): T {
  if (items.length === 0) {
    throw new Error("NEWS_WEIGHT_EMPTY");
  }
  const total = items.reduce((sum, row) => sum + row.weight, 0);
  let cursor = rng() * total;
  for (const row of items) {
    cursor -= row.weight;
    if (cursor <= 0) {
      return row.item;
    }
  }
  return requireItem(items[items.length - 1], "NEWS_WEIGHT_EMPTY").item;
}

function pickOne(rng: () => number, values: readonly string[]): string {
  if (values.length === 0) {
    throw new Error("NEWS_FILL_EMPTY");
  }
  return requireItem(values[Math.floor(rng() * values.length)] ?? values[0], "NEWS_FILL_EMPTY");
}

function fillSlots(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([a-z0-9]+)\}/gi, (_match, key: string) => {
    const value = vars[key];
    if (value === undefined) {
      throw new Error(`NEWS_FILL_MISSING:${key}`);
    }
    return value;
  });
}

function eventTypeFromRng(rng: () => number): NewsEventType {
  return pickWeighted(
    rng,
    EVENT_WEIGHTS.map((row) => ({ item: row.type, weight: row.weight })),
  );
}

function pickInstrument(rng: () => number, universe: readonly MockInstrument[]): MockInstrument {
  return pickWeighted(
    rng,
    universe.map((item) => ({ item, weight: CAP_WEIGHTS[item.market_cap_band] })),
  );
}

function buildVars(
  rng: () => number,
  templates: NewsTemplatesFile,
  instrument: MockInstrument,
): Record<string, string> {
  const fills = templates.fills;
  const pick = (key: string, fallback: readonly string[]): string => {
    const vocab = fills[key];
    return pickOne(rng, vocab && vocab.length > 0 ? vocab : fallback);
  };

  return {
    company: instrument.name,
    symbol: instrument.symbol,
    sector: instrument.sector,
    q: String(1 + Math.floor(rng() * 4)),
    pct: String(3 + Math.floor(rng() * 26)),
    target: String(20 + Math.floor(rng() * 480)),
    dealsize: (1 + rng() * 44).toFixed(1),
    bank: pick("bank", ["Goldman Sachs"]),
    concern: pick("concern", ["valuation"]),
    segment: pick("segment", ["cloud"]),
    product: pick("product", ["next-gen AI platform"]),
    market: pick("market", ["enterprise AI"]),
    stance: pick("stance", ["a data-dependent"]),
    direction: pick("direction", ["climb"]),
    yielddir: pick("yielddir", ["ease"]),
    inflation: pick("inflation", ["in line"]),
    futdir: pick("futdir", ["hold steady"]),
    agency: pick("agency", ["SEC"]),
    issue: pick("issue", ["disclosure practices"]),
    targetco: pick("targetco", ["a private AI startup"]),
  };
}

export type GeneratedNewsItem = Omit<NewsItem, "id"> & { id?: string };

export type GenerateNewsItemInput = {
  universe: readonly MockInstrument[];
  templates: NewsTemplatesFile;
  index: number;
  seed?: number;
  ts: string;
};

export function generateNewsItem(input: GenerateNewsItemInput): GeneratedNewsItem {
  const seed = input.seed ?? HISTORY_SEED;
  const rng = mulberry32(hashSymbolSeed(`news:${input.index}`, seed));
  const eventType = eventTypeFromRng(rng);
  const primary = pickInstrument(rng, input.universe);
  const headlines = input.templates[eventType];
  const template = requireItem(
    headlines[Math.floor(rng() * headlines.length)] ?? headlines[0],
    "NEWS_TEMPLATE_EMPTY",
  );
  const vars = buildVars(rng, input.templates, primary);
  const lo = Math.min(template.sentiment[0], template.sentiment[1]);
  const hi = Math.max(template.sentiment[0], template.sentiment[1]);
  const sentiment = lo + rng() * (hi - lo);
  const sentenceCount = 2 + Math.floor(rng() * 2);
  const bodyPool = BODY_LINES[eventType];
  const sentences: string[] = [];
  const used = new Set<number>();
  while (sentences.length < sentenceCount) {
    const idx = Math.floor(rng() * bodyPool.length);
    if (used.has(idx) && used.size < bodyPool.length) {
      continue;
    }
    used.add(idx);
    sentences.push(fillSlots(requireItem(bodyPool[idx], "NEWS_BODY_EMPTY"), vars));
  }
  let symbols = [primary.symbol];
  if (eventType === "macro") {
    const peers = input.universe.filter((row) => row.sector === primary.sector);
    const extra = Math.min(peers.length, 2 + Math.floor(rng() * 3));
    const picked = new Set<string>([primary.symbol]);
    for (let i = 0; i < extra && picked.size < extra; i += 1) {
      picked.add(
        pickOne(
          rng,
          peers.map((p) => p.symbol),
        ),
      );
    }
    symbols = [...picked];
  }
  return {
    ts: input.ts,
    headline: fillSlots(template.headline, vars),
    body: sentences.join(" "),
    source: pickOne(rng, SOURCES),
    symbols,
    sector: primary.sector,
    sentiment: Math.round(sentiment * 1000) / 1000,
    event_type: eventType,
  };
}

export function newsSeedId(index: number, seed = HISTORY_SEED): string {
  const rng = mulberry32(hashSymbolSeed(`news-id:${index}`, seed));
  const bytes = Array.from({ length: 16 }, () => Math.floor(rng() * 256));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function generateNewsBackfill(input: {
  universe: readonly MockInstrument[];
  templates: NewsTemplatesFile;
  count?: number;
  days?: number;
  seed?: number;
  endIso?: string;
}): NewsItem[] {
  const count = input.count ?? NEWS_BACKFILL_COUNT;
  const days = input.days ?? NEWS_BACKFILL_DAYS;
  const seed = input.seed ?? HISTORY_SEED;
  const endMs = Date.parse(input.endIso ?? "2026-09-09T20:00:00.000Z");
  const spanMs = days * 24 * 60 * 60 * 1000;
  const rows: NewsItem[] = [];
  for (let i = 0; i < count; i += 1) {
    const frac = count === 1 ? 1 : i / (count - 1);
    const ts = new Date(endMs - (1 - frac) * spanMs).toISOString();
    const generated = generateNewsItem({
      universe: input.universe,
      templates: input.templates,
      index: i,
      seed,
      ts,
    });
    rows.push({ ...generated, id: newsSeedId(i, seed) });
  }
  return rows;
}

export type NewsTickerPlanInput = {
  intervalSeconds: number;
  speed: number;
  paused: boolean;
  simElapsedSec: number;
  seed?: number;
  universe: readonly MockInstrument[];
  templates: NewsTemplatesFile;
  nowIso: string;
};

export type NewsTickerPlan = {
  items: NewsItem[];
  nextSimElapsedSec: number;
  bursts: number;
};

function liveCount(rng: () => number): number {
  return NEWS_LIVE_MIN_ITEMS + Math.floor(rng() * (NEWS_LIVE_MAX_ITEMS - NEWS_LIVE_MIN_ITEMS + 1));
}

export function planNewsTickerInvocation(input: NewsTickerPlanInput): NewsTickerPlan {
  const seed = input.seed ?? HISTORY_SEED;
  if (input.paused || input.speed <= 0) {
    return { items: [], nextSimElapsedSec: input.simElapsedSec, bursts: 0 };
  }
  const delta = Math.max(0, input.speed * input.intervalSeconds);
  let elapsed = input.simElapsedSec + delta;
  const items: NewsItem[] = [];
  let bursts = 0;
  let liveIndexBase = Math.floor(input.simElapsedSec / NEWS_LIVE_WINDOW_SEC) * 10_000;
  while (elapsed >= NEWS_LIVE_WINDOW_SEC) {
    elapsed -= NEWS_LIVE_WINDOW_SEC;
    bursts += 1;
    const bucket = Math.floor(liveIndexBase / 10_000);
    const rng = mulberry32(hashSymbolSeed(`news-live:${bucket}`, seed));
    const count = liveCount(rng);
    const burstTs = new Date(Date.parse(input.nowIso) + bursts * 1000).toISOString();
    for (let j = 0; j < count; j += 1) {
      const index = 1_000_000 + bucket * 8 + j;
      const generated = generateNewsItem({
        universe: input.universe,
        templates: input.templates,
        index,
        seed,
        ts: burstTs,
      });
      items.push({ ...generated, id: newsSeedId(index, seed) });
    }
    liveIndexBase += 10_000;
  }
  return { items, nextSimElapsedSec: elapsed, bursts };
}

/** Hook for market-tick: DT-SIM-01 shock row applied as a one-bar drift nudge (bps). */
export function newsPriceNudgeBps(sentiment: number): number {
  return newsSentimentDriftNudgeBps(sentiment, true);
}

export type NewsShock = { symbol: string; sentiment: number };

export function newsShocksForSymbols(
  items: readonly Pick<NewsItem, "ts" | "symbols" | "sentiment">[],
): NewsShock[] {
  const latest = new Map<string, { ts: string; sentiment: number }>();
  for (const item of items) {
    for (const symbol of item.symbols) {
      const prior = latest.get(symbol);
      if (!prior || item.ts >= prior.ts) {
        latest.set(symbol, { ts: item.ts, sentiment: item.sentiment });
      }
    }
  }
  return [...latest.entries()].map(([symbol, row]) => ({
    symbol,
    sentiment: row.sentiment,
  }));
}
