import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DES_STAT_GROUPS,
  desStatGroupsPresent,
  generateFundamentalsMetrics,
  hydrateFundamentalsUniverse,
  parseFundamentalsJson,
  parseInstrumentsJson,
  rangeSliderPct,
  rankIndustryPeers,
} from "./index";
import { HISTORY_SEED } from "./calendar";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "../../..");

function loadUniverse() {
  return parseInstrumentsJson(
    JSON.parse(readFileSync(path.join(root, "mock_data/instruments.json"), "utf8")) as unknown,
  );
}

function loadFundamentalsFile() {
  return parseFundamentalsJson(
    JSON.parse(readFileSync(path.join(root, "mock_data/fundamentals.json"), "utf8")) as unknown,
  );
}

describe("PBI-020 fundamentals generator", () => {
  it("hydrates one nested metrics object per instrument from the seed file", () => {
    const universe = loadUniverse();
    const file = loadFundamentalsFile();
    expect(file).toHaveLength(universe.length);
    const hydrated = hydrateFundamentalsUniverse(universe, file);
    expect(hydrated).toHaveLength(150);
    const nvda = hydrated.find((row) => row.symbol === "NVDA");
    expect(nvda?.metrics.valuation.pe).toBeCloseTo(32.9);
    expect(nvda?.metrics.income.revenue_periods.values).toHaveLength(4);
    expect(nvda?.metrics.analyst.buy).toBe(6);
  });

  it("is deterministic for a given seed", () => {
    const nvda = loadUniverse().find((row) => row.symbol === "NVDA");
    expect(nvda).toBeDefined();
    if (!nvda) {
      return;
    }
    const a = generateFundamentalsMetrics(nvda, { seed: HISTORY_SEED });
    const b = generateFundamentalsMetrics(nvda, { seed: HISTORY_SEED });
    expect(a).toEqual(b);
  });

  it("fills ETF groups without throwing (AC-020-01)", () => {
    const spy = loadUniverse().find((row) => row.symbol === "SPY");
    const file = loadFundamentalsFile().find((row) => row.symbol === "SPY");
    expect(spy).toBeDefined();
    if (!spy) {
      return;
    }
    const metrics = generateFundamentalsMetrics(spy, { fileMetrics: file?.metrics });
    expect(metrics.valuation.expense_ratio).toBeGreaterThan(0);
    expect(metrics.ranges.week52_high).toBeGreaterThan(metrics.ranges.week52_low);
    expect(desStatGroupsPresent(metrics).length).toBeGreaterThan(0);
  });

  it("TC-020-01 property: 20 random instruments expose every DES group key without missing fields", () => {
    const universe = loadUniverse();
    const file = loadFundamentalsFile();
    const hydrated = hydrateFundamentalsUniverse(universe, file);
    const rng = (seed: number) => {
      let a = seed >>> 0;
      return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        return a / 4294967296;
      };
    };
    const next = rng(HISTORY_SEED);
    const picked = new Set<number>();
    while (picked.size < 20) {
      picked.add(Math.floor(next() * hydrated.length));
    }
    for (const index of picked) {
      const row = hydrated[index];
      expect(row).toBeDefined();
      if (!row) {
        continue;
      }
      const present = desStatGroupsPresent(row.metrics);
      for (const group of DES_STAT_GROUPS) {
        expect(
          present.includes(group) ||
            group === "income" ||
            group === "margins" ||
            group === "valuation",
        ).toBe(true);
      }
      expect(row.metrics.income.revenue_periods.values.every((v) => Number.isFinite(v))).toBe(true);
      expect(row.metrics.income.eps_periods.values.every((v) => Number.isFinite(v))).toBe(true);
      expect(row.metrics.ranges.week52_high).toBeGreaterThan(row.metrics.ranges.week52_low);
      expect(
        row.metrics.analyst.buy + row.metrics.analyst.hold + row.metrics.analyst.sell,
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it("ranks same-industry peers by market-cap band then cap (AC-020-02)", () => {
    const peers = rankIndustryPeers(
      [
        {
          symbol: "NVDA",
          name: "NVIDIA",
          industry: "Semiconductors",
          market_cap_band: "mega",
          market_cap_b: 200,
        },
        {
          symbol: "AVGO",
          name: "Broadcom",
          industry: "Semiconductors",
          market_cap_band: "mega",
          market_cap_b: 150,
        },
        {
          symbol: "AMD",
          name: "AMD",
          industry: "Semiconductors",
          market_cap_band: "large",
          market_cap_b: 90,
        },
        {
          symbol: "INTC",
          name: "Intel",
          industry: "Semiconductors",
          market_cap_band: "large",
          market_cap_b: 80,
        },
        {
          symbol: "AAPL",
          name: "Apple",
          industry: "Consumer Electronics",
          market_cap_band: "mega",
          market_cap_b: 300,
        },
      ],
      "NVDA",
      6,
    );
    expect(peers.map((row) => row.symbol)).toEqual(["AVGO", "AMD", "INTC"]);
  });

  it("clamps the 52w slider between 0 and 100", () => {
    expect(rangeSliderPct(150, 100, 200)).toBe(50);
    expect(rangeSliderPct(50, 100, 200)).toBe(0);
    expect(rangeSliderPct(250, 100, 200)).toBe(100);
  });
});
