import { rangeSliderPct, rankIndustryPeers, type PeerCandidate } from "@meridian/mock-data";
import type { DesPeer, DesProfile, FundamentalsMetrics, Instrument } from "@meridian/schemas";

export const DES_KEY_STATS: { id: string; group: string; label: string }[] = [
  { id: "pe", group: "valuation", label: "P/E" },
  { id: "eps", group: "income", label: "EPS TTM" },
  { id: "revenue", group: "income", label: "Revenue" },
  { id: "growth", group: "income", label: "Rev growth" },
  { id: "gross", group: "margins", label: "Gross margin" },
  { id: "net", group: "margins", label: "Net margin" },
  { id: "yield", group: "dividends", label: "Div yield" },
  { id: "shares", group: "valuation", label: "Shares out" },
  { id: "mcap", group: "valuation", label: "Mkt cap" },
  { id: "expense", group: "valuation", label: "Exp ratio" },
  { id: "aum", group: "valuation", label: "AUM" },
  { id: "earnings", group: "income", label: "Next earn." },
  { id: "low", group: "ranges", label: "52w low" },
  { id: "high", group: "ranges", label: "52w high" },
];

export function formatNumber(value: number | undefined, digits = 2): string {
  if (value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPct(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}%`;
}

export function formatBillions(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `$${formatNumber(value, 1)}B`;
}

export function formatSharesM(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${formatNumber(value, 0)}M`;
}

export function keyStatValue(metrics: FundamentalsMetrics, id: string): string {
  switch (id) {
    case "pe":
      return formatNumber(metrics.valuation.pe, 1);
    case "eps":
      return formatNumber(metrics.income.eps_ttm, 2);
    case "revenue":
      return formatBillions(metrics.income.revenue_b);
    case "growth":
      return formatPct(metrics.income.revenue_growth_pct);
    case "gross":
      return formatPct(metrics.margins.gross_margin_pct);
    case "net":
      return formatPct(metrics.margins.net_margin_pct);
    case "yield":
      return formatPct(metrics.dividends.dividend_yield);
    case "shares":
      return formatSharesM(metrics.valuation.shares_out_m);
    case "mcap":
      return formatBillions(metrics.valuation.market_cap_b);
    case "expense":
      return formatPct(metrics.valuation.expense_ratio);
    case "aum":
      return formatBillions(metrics.valuation.aum_b);
    case "earnings":
      return metrics.income.next_earnings ?? "—";
    case "low":
      return formatNumber(metrics.ranges.week52_low, 2);
    case "high":
      return formatNumber(metrics.ranges.week52_high, 2);
    default:
      return "—";
  }
}

export function keyStatsForDisplay(
  metrics: FundamentalsMetrics,
): { id: string; label: string; value: string }[] {
  return DES_KEY_STATS.map((row) => ({
    id: row.id,
    label: row.label,
    value: keyStatValue(metrics, row.id),
  }));
}

export function week52MarkerPct(profile: DesProfile): number {
  const last =
    profile.quote?.last ??
    profile.instrument.base_price ??
    profile.fundamentals.metrics.ranges.week52_low;
  return rangeSliderPct(
    last,
    profile.fundamentals.metrics.ranges.week52_low,
    profile.fundamentals.metrics.ranges.week52_high,
  );
}

export function peersFromUniverse(
  instruments: readonly Instrument[],
  capById: ReadonlyMap<string, number | null>,
  lastById: ReadonlyMap<string, number | null>,
  activeSymbol: string,
): DesPeer[] {
  const candidates: PeerCandidate[] = instruments.map((row) => ({
    symbol: row.symbol,
    name: row.name,
    industry: row.industry,
    market_cap_band: row.market_cap_band,
    market_cap_b: capById.get(row.id) ?? null,
  }));
  return rankIndustryPeers(candidates, activeSymbol, 6).map((row) => {
    const instrument = instruments.find((item) => item.symbol === row.symbol);
    return {
      symbol: row.symbol,
      name: row.name,
      instrument_id: instrument?.id ?? "00000000-0000-4000-8000-000000000000",
      last: instrument ? (lastById.get(instrument.id) ?? null) : null,
      market_cap_b: row.market_cap_b,
    };
  });
}
