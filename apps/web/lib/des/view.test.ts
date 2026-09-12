import { describe, expect, it } from "vitest";
import type { FundamentalsMetrics } from "@meridian/schemas";
import { formatBillions, formatPct, keyStatValue, keyStatsForDisplay } from "./view";

const nvda: FundamentalsMetrics = {
  valuation: { pe: 32.9, shares_out_m: 623, market_cap_b: 98.5 },
  income: {
    eps_ttm: 4.8,
    revenue_b: 164,
    revenue_growth_pct: -1.2,
    next_earnings: "2026-08-26",
    revenue_periods: { labels: ["FY23", "FY24", "FY25", "TTM"], values: [140, 150, 160, 164] },
    eps_periods: { labels: ["FY23", "FY24", "FY25", "TTM"], values: [3.1, 3.8, 4.4, 4.8] },
  },
  margins: { gross_margin_pct: 59.5, net_margin_pct: 13.7 },
  dividends: { dividend_yield: 0 },
  ranges: { week52_low: 117.87, week52_high: 211.84 },
  analyst: { buy: 6, hold: 8, sell: 5 },
};

describe("DES view helpers TC-020-01", () => {
  it("formats every key-stat group without throwing on NVDA", () => {
    const rows = keyStatsForDisplay(nvda);
    expect(rows.map((row) => row.id)).toContain("pe");
    expect(keyStatValue(nvda, "pe")).toBe("32.9");
    expect(formatBillions(164)).toBe("$164.0B");
    expect(formatPct(-1.2)).toBe("-1.20%");
    expect(keyStatValue(nvda, "earnings")).toBe("2026-08-26");
  });

  it("renders em dash for missing ETF equity fields", () => {
    const etf: FundamentalsMetrics = {
      ...nvda,
      valuation: { expense_ratio: 0.38, aum_b: 577.5 },
      income: {
        ...nvda.income,
        eps_ttm: undefined,
        revenue_b: undefined,
        next_earnings: undefined,
      },
      margins: {},
    };
    expect(keyStatValue(etf, "pe")).toBe("—");
    expect(keyStatValue(etf, "eps")).toBe("—");
    expect(keyStatValue(etf, "expense")).toBe("0.38%");
    expect(() => keyStatsForDisplay(etf)).not.toThrow();
  });
});
