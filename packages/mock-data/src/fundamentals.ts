import type { FundamentalsFileRow, FundamentalsMetrics, MockInstrument } from "@meridian/schemas";
import { fundamentalsFileSchema, fundamentalsMetricsSchema } from "@meridian/schemas";
import { HISTORY_SEED } from "./calendar";
import { hashSymbolSeed, mulberry32 } from "./rng";

export const PERIOD_LABELS = ["FY23", "FY24", "FY25", "TTM"] as const;

const BAND_RANK: Record<string, number> = {
  mega: 5,
  large: 4,
  mid: 3,
  small: 2,
  micro: 1,
};

type Range = readonly [number, number];

/** Mock generation bands by sector (seed data only — not decision-table policy). */
const SECTOR_RANGES: Record<
  string,
  {
    pe: Range;
    gross: Range;
    net: Range;
    yield: Range;
    growth: Range;
  }
> = {
  Technology: { pe: [18, 48], gross: [40, 75], net: [8, 28], yield: [0, 1.8], growth: [-2, 28] },
  "Communication Services": {
    pe: [14, 38],
    gross: [35, 65],
    net: [5, 22],
    yield: [0, 2.4],
    growth: [-4, 18],
  },
  "Consumer Discretionary": {
    pe: [12, 42],
    gross: [20, 55],
    net: [2, 16],
    yield: [0, 2.2],
    growth: [-6, 22],
  },
  "Consumer Staples": {
    pe: [14, 32],
    gross: [25, 55],
    net: [4, 14],
    yield: [1.2, 3.6],
    growth: [0, 10],
  },
  Financials: { pe: [8, 22], gross: [40, 80], net: [12, 32], yield: [1.4, 4.2], growth: [-4, 14] },
  Healthcare: { pe: [14, 36], gross: [35, 78], net: [6, 24], yield: [0.4, 3], growth: [-2, 16] },
  Energy: { pe: [8, 20], gross: [20, 50], net: [4, 18], yield: [2, 5], growth: [-12, 18] },
  Industrials: { pe: [12, 30], gross: [18, 45], net: [4, 14], yield: [0.8, 3], growth: [-4, 14] },
  Materials: { pe: [10, 26], gross: [18, 42], net: [3, 14], yield: [1, 3.5], growth: [-8, 16] },
  Utilities: { pe: [12, 24], gross: [30, 55], net: [8, 16], yield: [2.4, 5], growth: [0, 8] },
  "Real Estate": {
    pe: [16, 40],
    gross: [50, 80],
    net: [10, 30],
    yield: [2, 5.5],
    growth: [-4, 12],
  },
  ETF: { pe: [0, 0], gross: [0, 0], net: [0, 0], yield: [0.8, 3.5], growth: [-2, 10] },
};

function lerp(rng: () => number, range: Range): number {
  return range[0] + rng() * (range[1] - range[0]);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function fourPeriod(
  ttm: number,
  growthPct: number,
): {
  labels: typeof PERIOD_LABELS;
  values: [number, number, number, number];
} {
  const g = 1 + growthPct / 100;
  const factor = Math.abs(g) < 0.05 ? 1 : g;
  const fy25 = ttm / factor;
  const fy24 = fy25 / factor;
  const fy23 = fy24 / factor;
  return {
    labels: PERIOD_LABELS,
    values: [round(fy23, 2), round(fy24, 2), round(fy25, 2), round(ttm, 2)],
  };
}

function asRecord(metrics: FundamentalsFileRow["metrics"]): Record<string, unknown> {
  return metrics as Record<string, unknown>;
}

function num(metrics: Record<string, unknown>, key: string): number | undefined {
  const value = metrics[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function pickRanges(sector: string) {
  return (
    SECTOR_RANGES[sector] ?? {
      pe: [12, 28] as Range,
      gross: [20, 50] as Range,
      net: [4, 16] as Range,
      yield: [0.5, 3] as Range,
      growth: [-4, 14] as Range,
    }
  );
}

export function generateFundamentalsMetrics(
  instrument: MockInstrument,
  options: { seed?: number; fileMetrics?: FundamentalsFileRow["metrics"] } = {},
): FundamentalsMetrics {
  const seed = options.seed ?? HISTORY_SEED;
  const rng = mulberry32(hashSymbolSeed(instrument.symbol, seed));
  const bands = pickRanges(instrument.sector);
  const file = options.fileMetrics ? asRecord(options.fileMetrics) : {};
  const etf = instrument.sector === "ETF";

  const growth = num(file, "revenue_growth_pct") ?? round(lerp(rng, bands.growth), 1);
  const revenue = num(file, "revenue_b") ?? round(lerp(rng, [8, 280]), 1);
  const eps = num(file, "eps_ttm") ?? round(lerp(rng, [0.4, 22]), 2);
  const pe = num(file, "pe") ?? (etf ? undefined : round(lerp(rng, bands.pe), 1));
  const gross =
    num(file, "gross_margin_pct") ?? (etf ? undefined : round(lerp(rng, bands.gross), 1));
  const net = num(file, "net_margin_pct") ?? (etf ? undefined : round(lerp(rng, bands.net), 1));
  const yieldPct = num(file, "dividend_yield") ?? round(lerp(rng, bands.yield), 2);
  const shares = num(file, "shares_out_m") ?? round(lerp(rng, [80, 5200]), 0);
  const expense = num(file, "expense_ratio");
  const aum = num(file, "aum_b");
  let low = num(file, "week52_low");
  let high = num(file, "week52_high");
  if (low === undefined || high === undefined) {
    const span = 0.18 + rng() * 0.35;
    low = round(instrument.base_price * (1 - span), 2);
    high = round(instrument.base_price * (1 + span * 0.7), 2);
  }
  if (high < low) {
    const swap = low;
    low = high;
    high = swap;
  }

  const fileAnalyst = options.fileMetrics?.analyst;
  const analyst = fileAnalyst ?? {
    buy: etf ? 0 : Math.floor(lerp(rng, [4, 28])),
    hold: etf ? 0 : Math.floor(lerp(rng, [3, 16])),
    sell: etf ? 0 : Math.floor(lerp(rng, [0, 8])),
  };

  const nestedFile = options.fileMetrics;
  const revenuePeriods =
    nestedFile?.income?.revenue_periods ?? fourPeriod(etf ? (aum ?? revenue) : revenue, growth);
  const epsPeriods = nestedFile?.income?.eps_periods ?? fourPeriod(etf ? 0 : eps, growth);

  const marketCapB =
    nestedFile?.valuation?.market_cap_b ??
    (etf ? aum : round((shares * instrument.base_price) / 1000, 2));

  const nextEarnings = typeof file.next_earnings === "string" ? file.next_earnings : undefined;

  return fundamentalsMetricsSchema.parse({
    valuation: {
      pe,
      market_cap_b: marketCapB,
      shares_out_m: etf ? undefined : shares,
      expense_ratio: expense ?? (etf ? round(lerp(rng, [0.03, 0.45]), 2) : undefined),
      aum_b: aum ?? (etf ? round(lerp(rng, [8, 600]), 1) : undefined),
    },
    income: {
      eps_ttm: etf ? undefined : eps,
      revenue_b: etf ? undefined : revenue,
      revenue_growth_pct: etf ? undefined : growth,
      next_earnings: nextEarnings,
      revenue_periods: revenuePeriods,
      eps_periods: epsPeriods,
    },
    margins: {
      gross_margin_pct: gross,
      net_margin_pct: net,
    },
    dividends: { dividend_yield: yieldPct },
    ranges: { week52_low: low, week52_high: high },
    analyst,
  });
}

export function parseFundamentalsJson(raw: unknown): FundamentalsFileRow[] {
  const parsed = fundamentalsFileSchema.parse(raw);
  const symbols = new Set<string>();
  for (const row of parsed) {
    if (symbols.has(row.symbol)) {
      throw new Error(`DUPLICATE_FUNDAMENTALS_SYMBOL:${row.symbol}`);
    }
    symbols.add(row.symbol);
  }
  return parsed;
}

export function hydrateFundamentalsUniverse(
  instruments: readonly MockInstrument[],
  fileRows: readonly FundamentalsFileRow[],
  seed: number = HISTORY_SEED,
): { symbol: string; metrics: FundamentalsMetrics }[] {
  const bySymbol = new Map(fileRows.map((row) => [row.symbol, row]));
  return instruments.map((instrument) => ({
    symbol: instrument.symbol,
    metrics: generateFundamentalsMetrics(instrument, {
      seed,
      fileMetrics: bySymbol.get(instrument.symbol)?.metrics,
    }),
  }));
}

export type PeerCandidate = {
  symbol: string;
  name: string;
  industry: string | null;
  market_cap_band?: string | null;
  market_cap_b: number | null;
};

export function rankIndustryPeers(
  candidates: readonly PeerCandidate[],
  activeSymbol: string,
  limit = 6,
): PeerCandidate[] {
  const key = activeSymbol.trim().toUpperCase();
  const self = candidates.find((row) => row.symbol.toUpperCase() === key);
  const industry = self?.industry;
  if (!industry) {
    return [];
  }
  return candidates
    .filter((row) => row.symbol.toUpperCase() !== key && row.industry === industry)
    .slice()
    .sort((a, b) => {
      const bandDelta =
        (BAND_RANK[b.market_cap_band ?? "micro"] ?? 0) -
        (BAND_RANK[a.market_cap_band ?? "micro"] ?? 0);
      if (bandDelta !== 0) {
        return bandDelta;
      }
      const capDelta = (b.market_cap_b ?? 0) - (a.market_cap_b ?? 0);
      if (capDelta !== 0) {
        return capDelta;
      }
      return a.symbol.localeCompare(b.symbol);
    })
    .slice(0, limit);
}

export function rangeSliderPct(last: number, low: number, high: number): number {
  if (!(high > low)) {
    return 50;
  }
  const pct = ((last - low) / (high - low)) * 100;
  return Math.min(100, Math.max(0, pct));
}

export const DES_STAT_GROUPS = [
  "profile",
  "valuation",
  "income",
  "margins",
  "dividends",
  "ranges",
  "analyst",
  "financials",
] as const;

export type DesStatGroup = (typeof DES_STAT_GROUPS)[number];

export function desStatGroupsPresent(metrics: FundamentalsMetrics): DesStatGroup[] {
  const groups: DesStatGroup[] = ["profile", "ranges", "analyst", "financials"];
  if (
    metrics.valuation.pe !== undefined ||
    metrics.valuation.shares_out_m !== undefined ||
    metrics.valuation.expense_ratio !== undefined ||
    metrics.valuation.aum_b !== undefined ||
    metrics.valuation.market_cap_b !== undefined
  ) {
    groups.push("valuation");
  }
  if (
    metrics.income.eps_ttm !== undefined ||
    metrics.income.revenue_b !== undefined ||
    metrics.income.next_earnings !== undefined
  ) {
    groups.push("income");
  }
  if (
    metrics.margins.gross_margin_pct !== undefined ||
    metrics.margins.net_margin_pct !== undefined
  ) {
    groups.push("margins");
  }
  groups.push("dividends");
  return DES_STAT_GROUPS.filter((id) => groups.includes(id));
}
