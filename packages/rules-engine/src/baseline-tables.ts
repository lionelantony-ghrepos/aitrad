import type { RuleDomain } from "@meridian/schemas";
import type { DecisionTable } from "./evaluate";
import { dtFee01, dtRisk01, dtVal01 } from "./doc05-fixtures";

/** Doc 05 §6 table keys. Thresholds live in table rows, not callers. */
export const BASELINE_TABLE_KEYS = [
  "DT-VAL-01",
  "DT-VAL-02",
  "DT-RISK-01",
  "DT-HRS-01",
  "DT-EXEC-01",
  "DT-FEE-01",
  "DT-AI-01",
  "DT-ENT-01",
  "DT-ALRT-01",
  "DT-RISK-02",
  "DT-SUIT-01",
  "DT-SIM-01",
] as const;

export type BaselineTableKey = (typeof BASELINE_TABLE_KEYS)[number];

export type DomainBinding = {
  domain: RuleDomain;
  tableKey: BaselineTableKey;
  hitPolicy: DecisionTable["hit_policy"];
};

export const DOMAIN_BINDINGS: readonly DomainBinding[] = [
  { domain: "order_validation", tableKey: "DT-VAL-01", hitPolicy: "COLLECT" },
  { domain: "order_validation", tableKey: "DT-VAL-02", hitPolicy: "COLLECT" },
  { domain: "pre_trade_risk", tableKey: "DT-RISK-01", hitPolicy: "FIRST" },
  { domain: "market_hours", tableKey: "DT-HRS-01", hitPolicy: "FIRST" },
  { domain: "execution_sim", tableKey: "DT-EXEC-01", hitPolicy: "FIRST" },
  { domain: "fees", tableKey: "DT-FEE-01", hitPolicy: "ALL" },
  { domain: "suitability", tableKey: "DT-SUIT-01", hitPolicy: "FIRST" },
  { domain: "entitlements", tableKey: "DT-ENT-01", hitPolicy: "FIRST" },
  { domain: "ai_action_policy", tableKey: "DT-AI-01", hitPolicy: "FIRST" },
  { domain: "alerting", tableKey: "DT-ALRT-01", hitPolicy: "FIRST" },
  { domain: "portfolio_analysis", tableKey: "DT-RISK-02", hitPolicy: "COLLECT" },
  { domain: "market_sim", tableKey: "DT-SIM-01", hitPolicy: "ALL" },
];

const dtVal02: DecisionTable = {
  id: "DT-VAL-02",
  hit_policy: "COLLECT",
  default_outputs: { decision: "valid" },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [
        { input: "group_type", op: "eq", value: "bracket" },
        { input: "side", op: "eq", value: "buy" },
        { input: "tp_not_above_entry", op: "eq", value: true },
      ],
      outputs: { decision: "reject", reason_code: "VAL_TP_ABOVE_ENTRY" },
    },
    {
      id: "2",
      priority: 2,
      conditions: [
        { input: "group_type", op: "eq", value: "bracket" },
        { input: "side", op: "eq", value: "buy" },
        { input: "sl_not_below_entry", op: "eq", value: true },
      ],
      outputs: { decision: "reject", reason_code: "VAL_SL_BELOW_ENTRY" },
    },
    {
      id: "3",
      priority: 3,
      conditions: [
        { input: "group_type", op: "eq", value: "bracket" },
        { input: "legs_count", op: "neq", value: 3 },
      ],
      outputs: { decision: "reject", reason_code: "VAL_BRACKET_LEGS" },
    },
    {
      id: "4",
      priority: 4,
      conditions: [
        { input: "trail_type", op: "eq", value: "percent" },
        { input: "trail_value", op: "between", value: [0.1, 50], negate: true },
      ],
      outputs: { decision: "reject", reason_code: "VAL_TRAIL_RANGE" },
    },
    {
      id: "5",
      priority: 5,
      conditions: [
        { input: "group_type", op: "eq", value: "oco" },
        { input: "legs_count", op: "neq", value: 2 },
      ],
      outputs: { decision: "reject", reason_code: "VAL_OCO_LEGS" },
    },
  ],
};

const dtHrs01: DecisionTable = {
  id: "DT-HRS-01",
  hit_policy: "FIRST",
  default_outputs: { decision: "allow" },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [
        { input: "session", op: "eq", value: "closed" },
        { input: "order_type", op: "eq", value: "market" },
      ],
      outputs: { decision: "reject", reason_code: "HRS_MARKET_CLOSED" },
    },
    {
      id: "2",
      priority: 2,
      conditions: [
        { input: "session", op: "eq", value: "closed" },
        { input: "order_type", op: "in", value: ["limit", "stop", "stop_limit"] },
      ],
      outputs: { decision: "queue_for_open" },
    },
    {
      id: "3",
      priority: 3,
      conditions: [{ input: "session", op: "eq", value: "open" }],
      outputs: { decision: "allow" },
    },
  ],
};

/** Band + large-notional combinations so FIRST can encode the adder without app math. */
const dtExec01: DecisionTable = {
  id: "DT-EXEC-01",
  hit_policy: "FIRST",
  default_outputs: { slippage_bps: 5, liquidity_cap_pct_adv: 5 },
  rows: [
    {
      id: "4a",
      priority: 1,
      conditions: [
        { input: "avg_volume_band", op: "eq", value: "high" },
        { input: "large_notional", op: "eq", value: true },
      ],
      outputs: { slippage_bps: 7, liquidity_cap_pct_adv: 10 },
    },
    {
      id: "4b",
      priority: 2,
      conditions: [
        { input: "avg_volume_band", op: "eq", value: "medium" },
        { input: "large_notional", op: "eq", value: true },
      ],
      outputs: { slippage_bps: 10, liquidity_cap_pct_adv: 5 },
    },
    {
      id: "4c",
      priority: 3,
      conditions: [
        { input: "avg_volume_band", op: "eq", value: "low" },
        { input: "large_notional", op: "eq", value: true },
      ],
      outputs: { slippage_bps: 20, liquidity_cap_pct_adv: 2 },
    },
    {
      id: "1",
      priority: 4,
      conditions: [{ input: "avg_volume_band", op: "eq", value: "high" }],
      outputs: { slippage_bps: 2, liquidity_cap_pct_adv: 10 },
    },
    {
      id: "2",
      priority: 5,
      conditions: [{ input: "avg_volume_band", op: "eq", value: "medium" }],
      outputs: { slippage_bps: 5, liquidity_cap_pct_adv: 5 },
    },
    {
      id: "3",
      priority: 6,
      conditions: [{ input: "avg_volume_band", op: "eq", value: "low" }],
      outputs: { slippage_bps: 15, liquidity_cap_pct_adv: 2 },
    },
  ],
};

const dtAi01: DecisionTable = {
  id: "DT-AI-01",
  hit_policy: "FIRST",
  default_outputs: { decision: "require_approval" },
  rows: [
    {
      id: "4",
      priority: 1,
      conditions: [
        { input: "tool", op: "eq", value: "propose_order" },
        { input: "order_notional", op: "gt", value: 50_000 },
      ],
      outputs: { decision: "block" },
    },
    {
      id: "5",
      priority: 2,
      conditions: [{ input: "messages_today", op: "gt", value: 200 }],
      outputs: { decision: "rate_limit", message: "Daily copilot quota reached." },
    },
    {
      id: "1",
      priority: 3,
      conditions: [{ input: "tool", op: "eq", value: "propose_order" }],
      outputs: { decision: "require_approval" },
    },
    {
      id: "2",
      priority: 4,
      conditions: [
        { input: "tool", op: "in", value: ["create_watchlist_item", "create_alert"] },
        { input: "actions_today", op: "lt", value: 50 },
      ],
      outputs: { decision: "auto_approve" },
    },
    {
      id: "3",
      priority: 5,
      conditions: [
        { input: "tool", op: "eq", value: "create_monitor" },
        { input: "monitors_count", op: "lt", value: 20 },
      ],
      outputs: { decision: "auto_approve" },
    },
  ],
};

const dtEnt01: DecisionTable = {
  id: "DT-ENT-01",
  hit_policy: "FIRST",
  default_outputs: { decision: "deny" },
  rows: [
    {
      id: "2",
      priority: 1,
      conditions: [{ input: "role", op: "eq", value: "admin" }],
      outputs: { decision: "allow" },
    },
    {
      id: "1",
      priority: 2,
      conditions: [
        { input: "role", op: "eq", value: "trader" },
        {
          input: "action",
          op: "regex",
          value: "^(trade|watchlist|alerts|copilot|screener):|^portfolio:read$",
        },
      ],
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

const dtAlrt01: DecisionTable = {
  id: "DT-ALRT-01",
  hit_policy: "FIRST",
  default_outputs: { decision: "deliver" },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [{ input: "same_rule_fired_within_min", op: "lt", value: 15 }],
      outputs: { decision: "suppress" },
    },
    {
      id: "2",
      priority: 2,
      conditions: [{ input: "rule_fires_today", op: "gte", value: 20 }],
      outputs: { decision: "suppress_and_pause_rule" },
    },
    {
      id: "3",
      priority: 3,
      conditions: [{ input: "user_alerts_today", op: "gte", value: 100 }],
      outputs: { decision: "suppress" },
    },
  ],
};

const dtRisk02: DecisionTable = {
  id: "DT-RISK-02",
  hit_policy: "COLLECT",
  default_outputs: { flags: [] },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [{ input: "max_position_pct", op: "gt", value: 25 }],
      outputs: { flag: "CONCENTRATION_POSITION" },
    },
    {
      id: "2",
      priority: 2,
      conditions: [{ input: "max_sector_pct", op: "gt", value: 40 }],
      outputs: { flag: "CONCENTRATION_SECTOR" },
    },
    {
      id: "3",
      priority: 3,
      conditions: [{ input: "portfolio_beta", op: "gt", value: 1.4 }],
      outputs: { flag: "HIGH_BETA_TILT" },
    },
    {
      id: "4",
      priority: 4,
      conditions: [{ input: "cash_pct", op: "gt", value: 30 }],
      outputs: { flag: "CASH_DRAG" },
    },
    {
      id: "5",
      priority: 5,
      conditions: [
        { input: "positions_count", op: "lt", value: 3 },
        { input: "equity", op: "gt", value: 10_000 },
      ],
      outputs: { flag: "LOW_DIVERSIFICATION" },
    },
  ],
};

const dtSuit01: DecisionTable = {
  id: "DT-SUIT-01",
  hit_policy: "FIRST",
  default_outputs: { suitability_tier: "standard" },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [{ input: "experience_level", op: "eq", value: "novice" }],
      outputs: { suitability_tier: "conservative" },
    },
    {
      id: "2",
      priority: 2,
      conditions: [{ input: "experience_level", op: "eq", value: "intermediate" }],
      outputs: { suitability_tier: "standard" },
    },
    {
      id: "3",
      priority: 3,
      conditions: [{ input: "experience_level", op: "eq", value: "advanced" }],
      outputs: { suitability_tier: "full" },
    },
  ],
};

const dtSim01: DecisionTable = {
  id: "DT-SIM-01",
  hit_policy: "ALL",
  default_outputs: { regime: "normal" },
  rows: [
    {
      id: "1",
      priority: 1,
      conditions: [{ input: "beta_class", op: "any" }],
      outputs: { gap_event_prob_per_day: 0.02, gap_range_pct: [1, 6] },
    },
    {
      id: "2",
      priority: 2,
      conditions: [{ input: "beta_class", op: "eq", value: "high" }],
      outputs: { vol_multiplier: 1.8 },
    },
    {
      id: "3",
      priority: 3,
      conditions: [{ input: "beta_class", op: "eq", value: "low" }],
      outputs: { vol_multiplier: 0.6 },
    },
    {
      id: "4",
      priority: 4,
      conditions: [{ input: "news_sentiment_shock", op: "eq", value: true }],
      outputs: { drift_nudge_bps_per_sentiment: 30 },
    },
  ],
};

const TABLES: Record<BaselineTableKey, DecisionTable> = {
  "DT-VAL-01": dtVal01,
  "DT-VAL-02": dtVal02,
  "DT-RISK-01": dtRisk01,
  "DT-HRS-01": dtHrs01,
  "DT-EXEC-01": dtExec01,
  "DT-FEE-01": dtFee01,
  "DT-AI-01": dtAi01,
  "DT-ENT-01": dtEnt01,
  "DT-ALRT-01": dtAlrt01,
  "DT-RISK-02": dtRisk02,
  "DT-SUIT-01": dtSuit01,
  "DT-SIM-01": dtSim01,
};

export function baselineTable(key: BaselineTableKey): DecisionTable {
  const table = TABLES[key];
  if (!table) {
    throw new Error(`UNKNOWN_BASELINE_TABLE:${key}`);
  }
  return table;
}

export function baselineCatalog(): {
  tables: DecisionTable[];
  bindings: readonly DomainBinding[];
  published: true;
} {
  return {
    tables: BASELINE_TABLE_KEYS.map((key) => TABLES[key]),
    bindings: DOMAIN_BINDINGS,
    published: true,
  };
}
