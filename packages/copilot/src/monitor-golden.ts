import type { MonitorCompileResult } from "@meridian/schemas";

function fire(
  input: string,
  op: "lte" | "lt" | "gte" | "gt",
  value: number,
): MonitorCompileResult["compiled_condition"] {
  return {
    id: "monitor",
    priority: 1,
    conditions: [{ input, op, value }],
    outputs: { decision: "fire" },
  };
}

/** Frozen expected JSON for TC-027-01 (10 canned NL instructions). */
export const MONITOR_GOLDEN_EXPECTED: ReadonlyArray<{
  nl: string;
  expected: MonitorCompileResult;
}> = [
  {
    nl: "tell me if any position drops 5% in a day",
    expected: {
      name: "Position day drop 5%",
      cadence: "5m",
      scope: { kind: "portfolio" },
      compiled_condition: fire("position_day_pct", "lte", -5),
      propose_action: null,
    },
  },
  {
    nl: "watch semis for negative news",
    expected: {
      name: "semiconductors negative news",
      cadence: "5m",
      scope: { kind: "sector", sector: "semiconductors" },
      compiled_condition: fire("news_sentiment", "lt", 0),
      propose_action: null,
    },
  },
  {
    nl: "alert if AAPL drops 3% today",
    expected: {
      name: "AAPL drop 3%",
      cadence: "5m",
      scope: { kind: "symbols", symbols: ["AAPL"] },
      compiled_condition: fire("pct_chg", "lte", -3),
      propose_action: null,
    },
  },
  {
    nl: "watch NVDA if last rises above 150",
    expected: {
      name: "NVDA last above 150",
      cadence: "5m",
      scope: { kind: "symbols", symbols: ["NVDA"] },
      compiled_condition: fire("last", "gte", 150),
      propose_action: null,
    },
  },
  {
    nl: "tell me if my portfolio is down 2% on the day",
    expected: {
      name: "Portfolio day drop 2%",
      cadence: "5m",
      scope: { kind: "portfolio" },
      compiled_condition: fire("portfolio_day_pct", "lte", -2),
      propose_action: null,
    },
  },
  {
    nl: "watch MSFT volume above 1000000",
    expected: {
      name: "MSFT volume",
      cadence: "5m",
      scope: { kind: "symbols", symbols: ["MSFT"] },
      compiled_condition: fire("volume", "gt", 1_000_000),
      propose_action: null,
    },
  },
  {
    nl: "if TSLA RSI goes below 30",
    expected: {
      name: "TSLA RSI",
      cadence: "5m",
      scope: { kind: "symbols", symbols: ["TSLA"] },
      compiled_condition: fire("rsi_14", "lt", 30),
      propose_action: null,
    },
  },
  {
    nl: "watch energy sector for drops of 4%",
    expected: {
      name: "energy drop 4%",
      cadence: "5m",
      scope: { kind: "sector", sector: "energy" },
      compiled_condition: fire("pct_chg", "lte", -4),
      propose_action: null,
    },
  },
  {
    nl: "notify me when SPY is up 1% today",
    expected: {
      name: "SPY up 1%",
      cadence: "5m",
      scope: { kind: "symbols", symbols: ["SPY"] },
      compiled_condition: fire("pct_chg", "gte", 1),
      propose_action: null,
    },
  },
  {
    nl: "watch my positions for negative news",
    expected: {
      name: "Positions negative news",
      cadence: "5m",
      scope: { kind: "portfolio" },
      compiled_condition: fire("news_sentiment", "lt", 0),
      propose_action: null,
    },
  },
];
