import type { PortfolioResponse, PortfolioAnalysisFacts } from "@meridian/schemas";
import { portfolioAnalysisFactsSchema } from "@meridian/schemas";
import type { BetaClass } from "@meridian/schemas";

/** Instrument class encoding for the `portfolio_beta` fact. Not a DT threshold. */
export function betaClassToAnalysisBeta(cls: BetaClass | null | undefined): number {
  if (cls === "high") {
    return 1.5;
  }
  if (cls === "low") {
    return 0.7;
  }
  return 1;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function portfolioAnalysisFactsFromBook(input: {
  portfolio: PortfolioResponse;
  betaBySymbol?: Readonly<Record<string, number>>;
  betaClassBySymbol?: Readonly<Record<string, BetaClass | null | undefined>>;
}): PortfolioAnalysisFacts {
  const { portfolio } = input;
  const equity = portfolio.account.equity;
  const maxPos = portfolio.allocations.by_position.reduce(
    (max, row) => Math.max(max, row.weight_pct),
    0,
  );
  const maxSector = portfolio.allocations.by_sector.reduce(
    (max, row) => Math.max(max, row.weight_pct),
    0,
  );
  let beta = 0;
  if (equity > 0 && portfolio.positions.length > 0) {
    let weighted = 0;
    for (const row of portfolio.positions) {
      const explicit = input.betaBySymbol?.[row.symbol];
      const fromClass = betaClassToAnalysisBeta(input.betaClassBySymbol?.[row.symbol]);
      const b = typeof explicit === "number" ? explicit : fromClass;
      weighted += (row.market_value / equity) * b;
    }
    beta = weighted;
  }
  const cashPct = equity === 0 ? 0 : (portfolio.account.cash / equity) * 100;
  return portfolioAnalysisFactsSchema.parse({
    max_position_pct: round2(maxPos),
    max_sector_pct: round2(maxSector),
    portfolio_beta: round2(beta),
    cash_pct: round2(cashPct),
    positions_count: portfolio.positions.length,
    equity: round2(equity),
  });
}

export function flagsFromCollectOutcome(outcome: unknown): string[] {
  const rows = Array.isArray(outcome) ? outcome : [outcome];
  const flags: string[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const flag = (row as { flag?: unknown }).flag;
    if (typeof flag === "string" && flag.length > 0) {
      flags.push(flag);
    }
  }
  return flags;
}
