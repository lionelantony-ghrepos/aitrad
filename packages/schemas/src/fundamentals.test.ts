import { describe, expect, it } from "vitest";
import {
  desProfileSchema,
  fundamentalsFileRowSchema,
  fundamentalsMetricsSchema,
  fundamentalsRecordSchema,
} from "./fundamentals";

const nested = {
  valuation: { pe: 32.9, shares_out_m: 623, market_cap_b: 98.5 },
  income: {
    eps_ttm: 4.8,
    revenue_b: 164,
    revenue_growth_pct: -1.2,
    next_earnings: "2026-08-26",
    revenue_periods: {
      labels: ["FY23", "FY24", "FY25", "TTM"] as const,
      values: [140, 150, 160, 164] as const,
    },
    eps_periods: {
      labels: ["FY23", "FY24", "FY25", "TTM"] as const,
      values: [3.1, 3.8, 4.4, 4.8] as const,
    },
  },
  margins: { gross_margin_pct: 59.5, net_margin_pct: 13.7 },
  dividends: { dividend_yield: 0 },
  ranges: { week52_low: 117.87, week52_high: 211.84 },
  analyst: { buy: 6, hold: 8, sell: 5 },
};

describe("fundamentals DTOs", () => {
  it("parses nested metrics and numeric strings", () => {
    const parsed = fundamentalsMetricsSchema.parse({
      ...nested,
      valuation: { pe: "32.9", shares_out_m: "623" },
    });
    expect(parsed.valuation.pe).toBeCloseTo(32.9);
    expect(parsed.analyst.buy).toBe(6);
  });

  it("rejects missing analyst groups", () => {
    const rest = {
      valuation: nested.valuation,
      income: nested.income,
      margins: nested.margins,
      dividends: nested.dividends,
      ranges: nested.ranges,
    };
    expect(fundamentalsMetricsSchema.safeParse(rest).success).toBe(false);
  });

  it("parses a seed file row in the doc 06 flat shape", () => {
    const row = fundamentalsFileRowSchema.parse({
      symbol: "NVDA",
      metrics: {
        pe: 32.9,
        eps_ttm: 4.8,
        revenue_b: 164,
        revenue_growth_pct: -1.2,
        gross_margin_pct: 59.5,
        net_margin_pct: 13.7,
        dividend_yield: 0,
        shares_out_m: 623,
        week52_low: 117.87,
        week52_high: 211.84,
        analyst: { buy: 6, hold: 8, sell: 5 },
        next_earnings: "2026-08-26",
      },
    });
    expect(row.symbol).toBe("NVDA");
    expect(row.metrics.pe).toBeCloseTo(32.9);
  });

  it("parses a fundamentals table row and DES profile envelope", () => {
    const record = fundamentalsRecordSchema.parse({
      instrument_id: "33333333-3333-4333-8333-333333333333",
      metrics: nested,
      updated_at: "2026-09-09T00:00:00.000Z",
    });
    expect(record.instrument_id.startsWith("3333")).toBe(true);
    const profile = desProfileSchema.parse({
      instrument: {
        id: record.instrument_id,
        symbol: "NVDA",
        name: "NVIDIA Corporation",
        exchange: "NASDAQ",
        sector: "Technology",
        industry: "Software",
        status: "active",
        currency: "USD",
        tick_size: 0.01,
        lot_size: 1,
        created_at: "2026-09-04T13:30:00.000Z",
        updated_at: "2026-09-04T13:30:00.000Z",
      },
      quote: {
        instrument_id: record.instrument_id,
        bid: 119.8,
        ask: 120.1,
        last: 120,
        prev_close: 118,
        volume: 900_000,
        ts: "2026-09-04T13:30:00.000Z",
      },
      fundamentals: record,
      peers: [],
    });
    expect(profile.instrument.symbol).toBe("NVDA");
  });
});
