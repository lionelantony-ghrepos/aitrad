import type { DecisionTable } from "./evaluate";

/** Doc 05 §6.3 / §7 vectors 1 and 8. Literals are table data, not application policy. */
export const dtRisk01: DecisionTable = {
  id: "DT-RISK-01",
  hit_policy: "FIRST",
  default_outputs: { decision: "allow" },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [{ input: "exceeds_buying_power", op: "eq", value: true }],
      outputs: { decision: "reject", reason_code: "RISK_BUYING_POWER" },
    },
    {
      id: "2",
      priority: 2,
      conditions: [{ input: "order_notional", op: "gt", value: 50_000 }],
      outputs: { decision: "reject", reason_code: "RISK_MAX_NOTIONAL" },
    },
    {
      id: "3",
      priority: 3,
      conditions: [
        { input: "position_pct_post", op: "gt", value: 25 },
        { input: "experience_level", op: "eq", value: "novice" },
      ],
      outputs: { decision: "reject", reason_code: "RISK_CONCENTRATION_NOVICE" },
    },
    {
      id: "4",
      priority: 4,
      conditions: [{ input: "position_pct_post", op: "gt", value: 40 }],
      outputs: { decision: "reject", reason_code: "RISK_CONCENTRATION" },
    },
    {
      id: "5",
      priority: 5,
      conditions: [{ input: "orders_today", op: "gte", value: 100 }],
      outputs: { decision: "reject", reason_code: "RISK_DAILY_ORDER_CAP" },
    },
    {
      id: "6",
      priority: 6,
      conditions: [
        { input: "instrument_beta_class", op: "eq", value: "high" },
        { input: "experience_level", op: "eq", value: "novice" },
        { input: "order_notional", op: "gt", value: 5000 },
      ],
      outputs: { decision: "require_ack", reason_code: "RISK_HIGH_BETA_ACK" },
    },
    {
      id: "7",
      priority: 7,
      conditions: [
        { input: "side", op: "eq", value: "sell" },
        { input: "exceeds_position_qty", op: "eq", value: true },
      ],
      outputs: { decision: "reject", reason_code: "RISK_NO_SHORTING" },
    },
  ],
};

/** Doc 05 §6.1 / §7 vector 2. */
export const dtVal01: DecisionTable = {
  id: "DT-VAL-01",
  hit_policy: "COLLECT",
  default_outputs: { decision: "valid" },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [{ input: "qty", op: "lte", value: 0 }],
      outputs: {
        decision: "reject",
        reason_code: "VAL_QTY_POSITIVE",
        message: "Quantity must be positive.",
      },
    },
    {
      id: "2",
      priority: 2,
      conditions: [{ input: "qty", op: "gt", value: 10_000 }],
      outputs: { decision: "reject", reason_code: "VAL_QTY_MAX" },
    },
    {
      id: "3",
      priority: 3,
      conditions: [
        { input: "order_type", op: "in", value: ["limit", "stop_limit"] },
        { input: "limit_price", op: "is_null" },
      ],
      outputs: { decision: "reject", reason_code: "VAL_LIMIT_REQUIRED" },
    },
    {
      id: "4",
      priority: 4,
      conditions: [
        { input: "order_type", op: "in", value: ["stop", "stop_limit"] },
        { input: "stop_price", op: "is_null" },
      ],
      outputs: { decision: "reject", reason_code: "VAL_STOP_REQUIRED" },
    },
    {
      id: "5",
      priority: 5,
      conditions: [
        { input: "order_type", op: "eq", value: "limit" },
        { input: "side", op: "eq", value: "buy" },
        { input: "limit_far_above_last", op: "eq", value: true },
      ],
      outputs: { decision: "warn", reason_code: "VAL_LIMIT_FAR" },
    },
    {
      id: "6",
      priority: 6,
      conditions: [{ input: "instrument_status", op: "neq", value: "active" }],
      outputs: { decision: "reject", reason_code: "VAL_HALTED" },
    },
    {
      id: "7",
      priority: 7,
      conditions: [
        { input: "tif", op: "eq", value: "IOC" },
        { input: "order_type", op: "neq", value: "limit" },
      ],
      outputs: { decision: "reject", reason_code: "VAL_IOC_LIMIT_ONLY" },
    },
    {
      id: "8",
      priority: 8,
      conditions: [{ input: "price_not_on_tick", op: "eq", value: true }],
      outputs: { decision: "reject", reason_code: "VAL_TICK_SIZE" },
    },
  ],
};

/** Doc 05 §6.2 row 4 / §7 vector 5. `negate` encodes prose “not between”. */
export const dtVal02Trail: DecisionTable = {
  id: "DT-VAL-02",
  hit_policy: "COLLECT",
  default_outputs: { decision: "valid" },
  rows: [
    {
      id: "4",
      priority: 4,
      conditions: [
        { input: "trail_type", op: "eq", value: "percent" },
        { input: "trail_value", op: "between", value: [0.1, 50], negate: true },
      ],
      outputs: { decision: "reject", reason_code: "VAL_TRAIL_RANGE" },
    },
  ],
};

/** Doc 05 §6.6 / §7 vectors 3 and 7. Fee arithmetic stays out of the engine. */
export const dtFee01: DecisionTable = {
  id: "DT-FEE-01",
  hit_policy: "ALL",
  default_outputs: { commission_usd: 0 },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [{ input: "side", op: "any" }],
      outputs: { commission_usd: 0 },
    },
    {
      id: "2",
      priority: 2,
      conditions: [{ input: "side", op: "eq", value: "sell" }],
      outputs: { sec_fee: "notional_x_sec_rate", taf: "qty_x_taf_capped" },
    },
    {
      id: "3",
      priority: 3,
      conditions: [{ input: "account_tier", op: "eq", value: "pro" }],
      outputs: { data_fee_monthly: 0 },
    },
  ],
};

/** Doc 05 §6.8 / §7 vector 4. */
export const dtEnt01: DecisionTable = {
  id: "DT-ENT-01",
  hit_policy: "FIRST",
  default_outputs: { decision: "deny" },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [
        { input: "role", op: "eq", value: "trader" },
        { input: "action", op: "regex", value: "^(trade|watchlist|alerts|copilot|screener):" },
      ],
      outputs: { decision: "allow" },
    },
    {
      id: "2",
      priority: 2,
      conditions: [{ input: "role", op: "eq", value: "admin" }],
      outputs: { decision: "allow" },
    },
    {
      id: "3",
      priority: 3,
      conditions: [
        { input: "role", op: "eq", value: "compliance" },
        { input: "action", op: "in", value: ["audit:read", "rules:read"] },
      ],
      outputs: { decision: "allow" },
    },
    {
      id: "4",
      priority: 4,
      conditions: [
        { input: "role", op: "eq", value: "compliance" },
        { input: "action", op: "regex", value: "^trade:" },
      ],
      outputs: { decision: "deny" },
    },
  ],
};
