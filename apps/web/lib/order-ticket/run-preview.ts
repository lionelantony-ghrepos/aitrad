import {
  assemblePreview,
  availableBuyingPower,
  buildOrderFacts,
  placeWithReserve,
  reserveAmountForSide,
} from "@meridian/paper-engine";
import {
  evaluateDomain,
  memoryAppendAudit,
  memoryPublishedTables,
  type EvaluateDomainPorts,
  type EvaluateDomainResult,
  type RulesAdminMemory,
} from "@meridian/rules-engine";
import type {
  Account,
  Instrument,
  OrderDraft,
  OrderPreviewResponse,
  Profile,
} from "@meridian/schemas";

export type LocalOrderSession = "open" | "closed";

function buyingPowerOf(account: Account): number {
  return availableBuyingPower({
    cashBalance: account.cash_balance,
    reservedCash: account.reserved_cash ?? 0,
  });
}

function evalPorts(memory: RulesAdminMemory): EvaluateDomainPorts {
  return {
    loadPublishedTables: async (domain) => memoryPublishedTables(memory, domain),
    writeRuleAudit: async (row) => {
      const id = crypto.randomUUID();
      memoryAppendAudit(memory, {
        id,
        domain: row.domain,
        context: row.context,
        outcome: row.outcome,
        matched_rows: row.matched_rows,
        table_versions: row.table_versions,
        latency_ms: row.latency_ms,
        created_at: new Date().toISOString(),
      });
      return { id };
    },
  };
}

function asFeeRecord(outcome: EvaluateDomainResult["outcome"]): Record<string, unknown> {
  return Array.isArray(outcome)
    ? (Object.assign({}, ...outcome) as Record<string, unknown>)
    : outcome;
}

export async function runLocalOrderPreview(input: {
  draft: OrderDraft;
  lastPrice: number;
  account: Account;
  profile: Profile | null;
  instrument: Instrument;
  memory: RulesAdminMemory;
  positionQty?: number;
  ordersToday?: number;
  /** Stub E2E defaults to an open session so clock does not gate the ticket. */
  session?: LocalOrderSession;
}): Promise<OrderPreviewResponse> {
  const buyingPower = buyingPowerOf(input.account);
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
    session: input.session ?? "open",
  });
  const ports = evalPorts(input.memory);
  const [validation, risk, fees, hours] = await Promise.all([
    evaluateDomain("order_validation", facts, ports),
    evaluateDomain("pre_trade_risk", facts, ports),
    evaluateDomain("fees", facts, ports),
    evaluateDomain("market_hours", facts, ports),
  ]);
  return assemblePreview({
    draft: input.draft,
    lastPrice: input.lastPrice,
    buyingPower,
    facts,
    validationOutcome: validation.outcome,
    riskOutcome: risk.outcome,
    feeOutcome: asFeeRecord(fees.outcome),
    hoursOutcome: hours.outcome,
  });
}

export async function runLocalOrderCreate(input: {
  draft: OrderDraft;
  lastPrice: number;
  account: Account;
  profile: Profile | null;
  instrument: Instrument;
  memory: RulesAdminMemory;
  reserve: (amount: number) => Promise<{ ok: boolean }>;
  positionQty?: number;
  ordersToday?: number;
  session?: LocalOrderSession;
}): Promise<{
  preview: OrderPreviewResponse;
  placement: Awaited<ReturnType<typeof placeWithReserve>>;
}> {
  const buyingPower = buyingPowerOf(input.account);
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
    session: input.session ?? "open",
  });
  const ports = evalPorts(input.memory);
  const validation = await evaluateDomain("order_validation", facts, ports);
  const risk = await evaluateDomain("pre_trade_risk", facts, ports);
  const hours = await evaluateDomain("market_hours", facts, ports);
  const fees = await evaluateDomain("fees", facts, ports);
  const preview = assemblePreview({
    draft: input.draft,
    lastPrice: input.lastPrice,
    buyingPower,
    facts,
    validationOutcome: validation.outcome,
    riskOutcome: risk.outcome,
    feeOutcome: asFeeRecord(fees.outcome),
    hoursOutcome: hours.outcome,
  });
  const placement = await placeWithReserve({
    validation: { outcome: validation.outcome, auditId: validation.auditId },
    risk: { outcome: risk.outcome, auditId: risk.auditId },
    hours: { outcome: hours.outcome, auditId: hours.auditId },
    reserveAmount: reserveAmountForSide({
      side: input.draft.side,
      orderNotional: preview.order_notional,
      estimatedFees: preview.estimated_fees,
    }),
    reserve: input.reserve,
  });
  return { preview, placement };
}
