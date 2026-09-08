import { describe, expect, it } from "vitest";
import type { OrderDraft } from "@meridian/schemas";
import { applyFeeSchedule, assemblePreview, buildOrderFacts, summarizeRisk } from "./preview";

const draft: OrderDraft = {
  symbol: "AAPL",
  side: "buy",
  qty: 5,
  order_type: "market",
  tif: "DAY",
};

function factsFor(qty: number, last = 200, buyingPower = 100_000) {
  return buildOrderFacts({
    draft: { ...draft, qty },
    lastPrice: last,
    buyingPower,
    positionQty: 0,
    equity: buyingPower,
    experienceLevel: "intermediate",
    instrumentStatus: "active",
    tickSize: 0.01,
    instrumentBetaClass: "medium",
    ordersToday: 0,
    accountTier: null,
  });
}

describe("buildOrderFacts", () => {
  it("computes notional from qty and last without embedding policy caps", () => {
    const facts = factsFor(300, 200);
    expect(facts.order_notional).toBe(60_000);
    expect(facts.exceeds_buying_power).toBe(false);
    expect(facts.qty).toBe(300);
  });
});

describe("assemblePreview", () => {
  it("fails when risk outcome is reject and totals a passing buy", () => {
    const facts = factsFor(5, 200);
    const rejected = assemblePreview({
      draft: { ...draft, qty: 300 },
      lastPrice: 200,
      buyingPower: 100_000,
      facts: factsFor(300, 200),
      validationOutcome: { decision: "valid" },
      riskOutcome: { decision: "reject", reason_code: "RISK_MAX_NOTIONAL" },
      feeOutcome: { commission_usd: 0 },
    });
    expect(rejected.passed).toBe(false);
    expect(summarizeRisk(rejected.risk_outcome).reason).toBe("RISK_MAX_NOTIONAL");

    const preview = assemblePreview({
      draft: { ...draft, qty: 5 },
      lastPrice: 200,
      buyingPower: 100_000,
      facts,
      validationOutcome: { decision: "valid" },
      riskOutcome: { decision: "allow" },
      feeOutcome: { commission_usd: 0 },
    });
    expect(preview.passed).toBe(true);
    expect(preview.est_total).toBe(1000);
    expect(preview.estimated_fees).toBe(0);
  });
});

describe("applyFeeSchedule", () => {
  it("uses rates from the fee outcome, not literals in this module", () => {
    const fees = applyFeeSchedule(
      { commission_usd: 0, sec_rate: 0.01, taf_per_share: 0.1, taf_cap: 1 },
      { notional: 1000, qty: 10 },
    );
    expect(fees.sec_fee).toBe(10);
    expect(fees.taf).toBe(1);
  });
});
