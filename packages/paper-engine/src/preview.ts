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
  session: "open" | "closed";
};

export type OrderFacts = Record<string, unknown>;

/** Fail-closed when `quotes_latest.last` is missing or non-positive. */
export const QUOTE_UNAVAILABLE = "QUOTE_UNAVAILABLE";

/**
 * Last used for DT-VAL / DT-RISK / DT-FEE facts and preview totals.
 * Client `last_price` is accepted on the wire for display callers but is never
 * a fallback when the server quote is absent.
 */
export function lastPriceForRuleFacts(input: { quoteLast: unknown; clientLast?: unknown }): number {
  void input.clientLast;
  const n =
    typeof input.quoteLast === "number"
      ? input.quoteLast
      : typeof input.quoteLast === "string" && input.quoteLast.length > 0
        ? Number(input.quoteLast)
        : Number.NaN;
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(QUOTE_UNAVAILABLE);
  }
  return n;
}

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
  const groupType = draft.group_type ?? null;
  const entryRef = ref;
  const tpPrice = draft.tp_price ?? null;
  const slPrice = draft.sl_price ?? null;
  const legsCount =
    groupType === "bracket" ? 3 : groupType === "oco" ? 2 : groupType == null ? null : 1;
  const tpNotAboveEntry =
    groupType === "bracket" &&
    draft.side === "buy" &&
    tpPrice != null &&
    Number.isFinite(tpPrice) &&
    tpPrice <= entryRef;
  const slNotBelowEntry =
    groupType === "bracket" &&
    draft.side === "buy" &&
    slPrice != null &&
    Number.isFinite(slPrice) &&
    slPrice >= entryRef;

  return {
    qty: draft.qty,
    side: draft.side,
    order_type: draft.order_type,
    tif: draft.tif,
    limit_price: draft.limit_price ?? null,
    stop_price: draft.stop_price ?? null,
    last_price: last,
    group_type: groupType,
    trail_type: draft.trail_type ?? null,
    trail_value: draft.trail_value ?? null,
    legs_count: legsCount,
    entry_ref_price: entryRef,
    tp_price: tpPrice,
    sl_price: slPrice,
    tp_not_above_entry: tpNotAboveEntry,
    sl_not_below_entry: slNotBelowEntry,
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
    session: input.session,
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

const VAL02_CODES = new Set([
  "VAL_TP_ABOVE_ENTRY",
  "VAL_SL_BELOW_ENTRY",
  "VAL_BRACKET_LEGS",
  "VAL_TRAIL_RANGE",
  "VAL_OCO_LEGS",
]);

function validationTableKey(row: Record<string, unknown>): "DT-VAL-01" | "DT-VAL-02" {
  const code = typeof row.reason_code === "string" ? row.reason_code : "";
  return VAL02_CODES.has(code) ? "DT-VAL-02" : "DT-VAL-01";
}

export function summarizeValidation(outcome: unknown): OrderPreviewRule[] {
  const rows = asRecords(outcome);
  const rejects = rows.filter((row) => decisionOf(row) === "reject");
  if (rejects.length > 0) {
    return rejects.map((row) => ({
      table_key: validationTableKey(row),
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
    {
      table_key: "DT-VAL-02",
      passed: true,
      decision: "valid",
      reason: "valid",
    },
  ];
}

export function summarizeHours(outcome: unknown): OrderPreviewRule {
  const row = asRecords(outcome)[0] ?? { decision: "allow" };
  const decision = decisionOf(row);
  const passed = decision !== "reject";
  return {
    table_key: "DT-HRS-01",
    passed,
    decision,
    reason: reasonFromOutcome(row),
    ...(typeof row.reason_code === "string" ? { reason_code: row.reason_code } : {}),
  };
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
  hoursOutcome: unknown;
}): OrderPreviewResponse {
  const notional = typeof input.facts.order_notional === "number" ? input.facts.order_notional : 0;
  const fees = applyFeeSchedule(input.feeOutcome, { notional, qty: input.draft.qty });
  const estimatedFees = fees.commission_usd + fees.sec_fee + fees.taf;
  const estTotal =
    input.draft.side === "sell" ? notional - estimatedFees : notional + estimatedFees;
  const valRules = summarizeValidation(input.validationOutcome);
  const riskRule = summarizeRisk(input.riskOutcome);
  const hoursRule = summarizeHours(input.hoursOutcome);
  const rules: OrderPreviewRule[] = [
    ...valRules,
    riskRule,
    hoursRule,
    {
      table_key: "DT-FEE-01",
      passed: true,
      decision: "fees",
      reason: "estimated",
    },
  ];
  return {
    passed: valRules.every((row) => row.passed) && riskRule.passed && hoursRule.passed,
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
    hours_outcome: Array.isArray(input.hoursOutcome)
      ? input.hoursOutcome
      : ((input.hoursOutcome as Record<string, unknown> | undefined) ?? {}),
  };
}
