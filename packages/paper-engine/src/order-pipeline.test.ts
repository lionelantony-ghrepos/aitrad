import { describe, expect, it } from "vitest";
import {
  createRulesAdminMemory,
  evaluateDomain,
  memoryAppendAudit,
  memoryPublishedTables,
  type EvaluateDomainPorts,
} from "@meridian/rules-engine";
import type { OrderDraft } from "@meridian/schemas";
import { SerializedCashBook, reserveAmountForSide } from "./buying-power";
import { decideOrderPlacement, placeWithReserve } from "./order-pipeline";
import { assemblePreview, buildOrderFacts } from "./preview";

const draft: OrderDraft = {
  symbol: "AAPL",
  side: "buy",
  qty: 10,
  order_type: "market",
  tif: "DAY",
};

function ports(): EvaluateDomainPorts {
  const memory = createRulesAdminMemory();
  return {
    loadPublishedTables: async (domain) => memoryPublishedTables(memory, domain),
    writeRuleAudit: async (row) => {
      const id = crypto.randomUUID();
      memoryAppendAudit(memory, {
        id,
        domain: row.domain,
        context: row.context,
        outcome: row.outcome,
        created_at: new Date().toISOString(),
      });
      return { id };
    },
  };
}

function facts(input: {
  qty: number;
  last: number;
  buyingPower: number;
  session: "open" | "closed";
}) {
  return buildOrderFacts({
    draft: { ...draft, qty: input.qty },
    lastPrice: input.last,
    buyingPower: input.buyingPower,
    positionQty: 0,
    equity: input.buyingPower,
    experienceLevel: "intermediate",
    instrumentStatus: "active",
    tickSize: 0.01,
    instrumentBetaClass: "medium",
    ordersToday: 0,
    accountTier: null,
    session: input.session,
  });
}

describe("TC-014-03 insufficient funds rejected with DT-RISK-01 audit (AC-014-03)", () => {
  it("evaluates pre_trade_risk and stores RISK_BUYING_POWER plus audit id", async () => {
    const evalPorts = ports();
    const context = facts({ qty: 10, last: 200, buyingPower: 500, session: "open" });
    const [validation, risk, hours] = await Promise.all([
      evaluateDomain("order_validation", context, evalPorts),
      evaluateDomain("pre_trade_risk", context, evalPorts),
      evaluateDomain("market_hours", context, evalPorts),
    ]);
    const decision = decideOrderPlacement({
      validation: { outcome: validation.outcome, auditId: validation.auditId },
      risk: { outcome: risk.outcome, auditId: risk.auditId },
      hours: { outcome: hours.outcome, auditId: hours.auditId },
    });
    expect(decision.status).toBe("rejected");
    expect(decision.blockingTable).toBe("DT-RISK-01");
    expect(decision.rejectReason).toBe("RISK_BUYING_POWER");
    expect(decision.ruleAuditId).toBe(risk.auditId);
    expect(decision.ruleAuditId.length).toBeGreaterThan(0);
  });
});

describe("TC-014-04 closed session follows DT-HRS-01 (AC-014-04)", () => {
  it("rejects a market order when session is closed", async () => {
    const evalPorts = ports();
    const context = facts({ qty: 1, last: 10, buyingPower: 100_000, session: "closed" });
    const hours = await evaluateDomain("market_hours", context, evalPorts);
    const preview = assemblePreview({
      draft: { ...draft, qty: 1 },
      lastPrice: 10,
      buyingPower: 100_000,
      facts: context,
      validationOutcome: { decision: "valid" },
      riskOutcome: { decision: "allow" },
      feeOutcome: { commission_usd: 0 },
      hoursOutcome: hours.outcome,
    });
    expect(preview.passed).toBe(false);
    const hrs = preview.rules.find((row) => row.table_key === "DT-HRS-01");
    expect(hrs?.decision).toBe("reject");
    expect(hrs?.reason_code).toBe("HRS_MARKET_CLOSED");
  });

  it("queues non-market orders when session is closed", async () => {
    const evalPorts = ports();
    const limitDraft: OrderDraft = { ...draft, qty: 1, order_type: "limit", limit_price: 9 };
    const context = buildOrderFacts({
      draft: limitDraft,
      lastPrice: 10,
      buyingPower: 100_000,
      positionQty: 0,
      equity: 100_000,
      experienceLevel: "intermediate",
      instrumentStatus: "active",
      tickSize: 0.01,
      instrumentBetaClass: "medium",
      ordersToday: 0,
      accountTier: null,
      session: "closed",
    });
    const hours = await evaluateDomain("market_hours", context, evalPorts);
    const decision = decideOrderPlacement({
      validation: { outcome: { decision: "valid" }, auditId: "v" },
      risk: { outcome: { decision: "allow" }, auditId: "r" },
      hours: { outcome: hours.outcome, auditId: hours.auditId },
    });
    expect(decision.status).toBe("accepted");
    const preview = assemblePreview({
      draft: limitDraft,
      lastPrice: 10,
      buyingPower: 100_000,
      facts: context,
      validationOutcome: { decision: "valid" },
      riskOutcome: { decision: "allow" },
      feeOutcome: { commission_usd: 0 },
      hoursOutcome: hours.outcome,
    });
    expect(preview.passed).toBe(true);
    expect(preview.rules.find((row) => row.table_key === "DT-HRS-01")?.decision).toBe(
      "queue_for_open",
    );
  });
});

describe("placeWithReserve", () => {
  it("turns a passing eval into a reserve miss with DT-RISK-01", async () => {
    const book = new SerializedCashBook({ cashBalance: 100, reservedCash: 0 });
    const amount = reserveAmountForSide({ side: "buy", orderNotional: 80, estimatedFees: 0 });
    const first = await placeWithReserve({
      validation: { outcome: { decision: "valid" }, auditId: "v" },
      risk: { outcome: { decision: "allow" }, auditId: "risk-audit" },
      hours: { outcome: { decision: "allow" }, auditId: "h" },
      reserveAmount: amount,
      reserve: (value) => book.reserve(value),
    });
    expect(first.status).toBe("accepted");
    const second = await placeWithReserve({
      validation: { outcome: { decision: "valid" }, auditId: "v2" },
      risk: { outcome: { decision: "allow" }, auditId: "risk-audit-2" },
      hours: { outcome: { decision: "allow" }, auditId: "h2" },
      reserveAmount: amount,
      reserve: (value) => book.reserve(value),
    });
    expect(second.status).toBe("rejected");
    expect(second.rejectReason).toBe("RISK_BUYING_POWER");
    expect(second.ruleAuditId).toBe("risk-audit-2");
  });
});
