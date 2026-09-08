import type {
  OrderDraft,
  OrderFeeBreakdown,
  OrderPreviewResponse,
  OrderPreviewRule,
} from "@meridian/schemas";
import { notionalFromShares, referencePrice } from "./qty-mode";

export type OrderFactInput = {
  draft: OrderDraft;
  lastPrice: number;
  buyingPower: number;
  positionQty: number;
  equity: number;
  experienceLevel: string | null;
  instrumentStatus: string;
  tickSize: number;
  instrumentBetaClass: string | null;
  ordersToday: number;
  accountTier: string | null;
};

export type OrderFacts = Record<string, unknown>;

function priceNotOnTick(price: number | null | undefined, tickSize: number): boolean {
  if (price == null || !Number.isFinite(price) || !(tickSize > 0)) {
    return false;
  }
  const quotient = price / tickSize;
  return Math.abs(quotient - Math.round(quotient)) > 1e-8;
}

export function buildOrderFacts(input: OrderFactInput): OrderFacts {
  const { draft } = input;
  const last = input.lastPrice;
  const ref = referencePrice({
    orderType: draft.order_type,
    lastPrice: last,
    limitPrice: draft.limit_price,
  });
  const orderNotional = notionalFromShares(draft.qty, ref);
  const postQty =
    draft.side === "buy" ? input.positionQty + draft.qty : input.positionQty - draft.qty;
  const equity = input.equity > 0 ? input.equity : input.buyingPower;
  const positionMktPost = postQty * last;
  const positionPctPost = equity > 0 ? (positionMktPost / equity) * 100 : 0;

  return {
    qty: draft.qty,
    side: draft.side,
    order_type: draft.order_type,
    tif: draft.tif,
    limit_price: draft.limit_price ?? null,
    stop_price: draft.stop_price ?? null,
    last_price: last,
    order_notional: orderNotional,
    buying_power: input.buyingPower,
    exceeds_buying_power: orderNotional > input.buyingPower,
    position_qty: input.positionQty,
    exceeds_position_qty: draft.qty > input.positionQty,
    position_pct_post: positionPctPost,
    experience_level: input.experienceLevel,
    instrument_status: input.instrumentStatus,
    instrument_beta_class: input.instrumentBetaClass,
    orders_today: input.ordersToday,
    account_tier: input.accountTier,
    price_not_on_tick:
      priceNotOnTick(draft.limit_price, input.tickSize) ||
      priceNotOnTick(draft.stop_price, input.tickSize),
  };
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.length > 0 && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

/** Numeric fees from DT-FEE-01 outputs. Rates come from the table row, not callers. */
export function applyFeeSchedule(
  feeOutcome: Record<string, unknown>,
  input: { notional: number; qty: number },
): OrderFeeBreakdown {
  const commission = asNumber(feeOutcome.commission_usd) ?? 0;
  const secDirect = asNumber(feeOutcome.sec_fee);
  const secRate = asNumber(feeOutcome.sec_rate);
  const secFee = secDirect ?? (secRate !== null ? input.notional * secRate : 0);
  const tafDirect = asNumber(feeOutcome.taf);
  const tafPer = asNumber(feeOutcome.taf_per_share);
  const tafCap = asNumber(feeOutcome.taf_cap);
  let taf = tafDirect ?? 0;
  if (tafDirect === null && tafPer !== null) {
    const raw = input.qty * tafPer;
    taf = tafCap !== null ? Math.min(raw, tafCap) : raw;
  }
  const dataFee = asNumber(feeOutcome.data_fee_monthly) ?? undefined;
  return {
    commission_usd: commission,
    sec_fee: secFee,
    taf,
    ...(dataFee !== undefined ? { data_fee_monthly: dataFee } : {}),
  };
}

function asRecords(outcome: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(outcome)) {
    return outcome.filter(
      (row): row is Record<string, unknown> => typeof row === "object" && row !== null,
    );
  }
  if (outcome && typeof outcome === "object") {
    return [outcome as Record<string, unknown>];
  }
  return [];
}

export function reasonFromOutcome(row: Record<string, unknown>): string {
  if (typeof row.message === "string" && row.message.length > 0) {
    return row.message;
  }
  if (typeof row.reason_code === "string" && row.reason_code.length > 0) {
    return row.reason_code;
  }
  if (typeof row.decision === "string" && row.decision.length > 0) {
    return row.decision;
  }
  return "ok";
}

function decisionOf(row: Record<string, unknown>): string {
  return typeof row.decision === "string" ? row.decision : "unknown";
}

export function summarizeValidation(outcome: unknown): OrderPreviewRule[] {
  const rows = asRecords(outcome);
  const rejects = rows.filter((row) => decisionOf(row) === "reject");
  if (rejects.length > 0) {
    return rejects.map((row) => ({
      table_key: "DT-VAL-01",
      passed: false,
      decision: decisionOf(row),
      reason: reasonFromOutcome(row),
      ...(typeof row.reason_code === "string" ? { reason_code: row.reason_code } : {}),
    }));
  }
  const primary = rows[0] ?? { decision: "valid" };
  return [
    {
      table_key: "DT-VAL-01",
      passed: true,
      decision: decisionOf(primary),
      reason: reasonFromOutcome(primary),
    },
  ];
}

export function summarizeRisk(outcome: unknown): OrderPreviewRule {
  const row = asRecords(outcome)[0] ?? { decision: "allow" };
  const decision = decisionOf(row);
  const passed = decision === "allow";
  return {
    table_key: "DT-RISK-01",
    passed,
    decision,
    reason: reasonFromOutcome(row),
    ...(typeof row.reason_code === "string" ? { reason_code: row.reason_code } : {}),
  };
}

export function assemblePreview(input: {
  draft: OrderDraft;
  lastPrice: number;
  buyingPower: number;
  facts: OrderFacts;
  validationOutcome: unknown;
  riskOutcome: unknown;
  feeOutcome: Record<string, unknown>;
}): OrderPreviewResponse {
  const notional = typeof input.facts.order_notional === "number" ? input.facts.order_notional : 0;
  const fees = applyFeeSchedule(input.feeOutcome, { notional, qty: input.draft.qty });
  const estimatedFees = fees.commission_usd + fees.sec_fee + fees.taf;
  const estTotal =
    input.draft.side === "sell" ? notional - estimatedFees : notional + estimatedFees;
  const valRules = summarizeValidation(input.validationOutcome);
  const riskRule = summarizeRisk(input.riskOutcome);
  const rules: OrderPreviewRule[] = [
    ...valRules,
    riskRule,
    {
      table_key: "DT-FEE-01",
      passed: true,
      decision: "fees",
      reason: "estimated",
    },
  ];
  return {
    passed: valRules.every((row) => row.passed) && riskRule.passed,
    buying_power: input.buyingPower,
    last_price: input.lastPrice,
    qty: input.draft.qty,
    order_notional: notional,
    estimated_fees: estimatedFees,
    est_total: estTotal,
    fees,
    rules,
    validation_outcome: Array.isArray(input.validationOutcome)
      ? input.validationOutcome
      : ((input.validationOutcome as Record<string, unknown> | undefined) ?? {}),
    risk_outcome: Array.isArray(input.riskOutcome)
      ? input.riskOutcome
      : ((input.riskOutcome as Record<string, unknown> | undefined) ?? {}),
    fee_outcome: input.feeOutcome,
  };
}
