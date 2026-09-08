import { assemblePreview, buildOrderFacts } from "@meridian/paper-engine";
import {
  evaluateDomain,
  memoryAppendAudit,
  memoryPublishedTables,
  type EvaluateDomainPorts,
  type RulesAdminMemory,
} from "@meridian/rules-engine";
import type {
  Account,
  Instrument,
  OrderDraft,
  OrderPreviewResponse,
  Profile,
} from "@meridian/schemas";

export function runLocalOrderPreview(input: {
  draft: OrderDraft;
  lastPrice: number;
  account: Account;
  profile: Profile | null;
  instrument: Instrument;
  memory: RulesAdminMemory;
  positionQty?: number;
  ordersToday?: number;
}): Promise<OrderPreviewResponse> {
  const buyingPower = input.account.cash_balance;
  const facts = buildOrderFacts({
    draft: input.draft,
    lastPrice: input.lastPrice,
    buyingPower,
    positionQty: input.positionQty ?? 0,
    equity: buyingPower,
    experienceLevel: input.profile?.experience_level ?? null,
    instrumentStatus: input.instrument.status,
    tickSize: input.instrument.tick_size,
    instrumentBetaClass: input.instrument.beta_class ?? null,
    ordersToday: input.ordersToday ?? 0,
    accountTier: null,
  });

  const ports: EvaluateDomainPorts = {
    loadPublishedTables: async (domain) => memoryPublishedTables(input.memory, domain),
    writeRuleAudit: async (row) => {
      const id = crypto.randomUUID();
      memoryAppendAudit(input.memory, {
        id,
        domain: row.domain,
        context: row.context,
        outcome: row.outcome,
        created_at: new Date().toISOString(),
      });
      return { id };
    },
  };

  return Promise.all([
    evaluateDomain("order_validation", facts, ports),
    evaluateDomain("pre_trade_risk", facts, ports),
    evaluateDomain("fees", facts, ports),
  ]).then(([validation, risk, fees]) => {
    const feeOutcome = Array.isArray(fees.outcome)
      ? (Object.assign({}, ...fees.outcome) as Record<string, unknown>)
      : fees.outcome;
    return assemblePreview({
      draft: input.draft,
      lastPrice: input.lastPrice,
      buyingPower,
      facts,
      validationOutcome: validation.outcome,
      riskOutcome: risk.outcome,
      feeOutcome,
    });
  });
}
