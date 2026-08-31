# Meridian — Business Rules & Decision Tables Specification

**Version:** 1.0 | **Date:** 2026-07-03
Principle: **no business logic in application code.** All policy lives in versioned, published decision tables evaluated by `@meridian/rules-engine` via `rules-service`. Code only orchestrates.

## 1. Concepts
- **Rule set** — a named domain (e.g. `pre_trade_risk`) bound to one or more decision tables via `rule_bindings`.
- **Decision table** — versioned artifact: input columns (typed), condition cells (operator + value), output columns, hit policy, priority-ordered rows, effective dates, status `draft|published|retired`.
- **Hit policies:** `FIRST` (highest-priority matching row wins), `ALL` (all matching rows' outputs merged, later overrides), `COLLECT` (all matching rows returned as a list — used for multi-message validation).
- **Evaluation contract:** `evaluateDomain(domain, context) → { outcome, matchedRows, trace, auditId }`. Every evaluation is persisted to `rule_audit`.

## 2. Storage schema (jsonb shapes)
```jsonc
// decision_rows.conditions
[{ "input": "order_notional", "op": "gt", "value": 50000 },
 { "input": "experience_level", "op": "in", "value": ["novice"] }]
// decision_rows.outputs
{ "decision": "reject", "reason_code": "RISK_MAX_NOTIONAL",
  "message": "Order exceeds your ${max} single-order limit." }
```
Operators: `eq neq lt lte gt gte in not_in between regex is_null any` (`any` = wildcard/always-true cell). Values may reference context (`${field}`) in output messages only.

## 3. Semantics
1. Filter rows by `effective_from <= clock < effective_to` (nulls open-ended).
2. Evaluate conditions per row (AND across cells).
3. Apply hit policy. No match ⇒ table's declared `default_outputs` (every table MUST define defaults — deny-by-default for entitlement/risk domains, allow for validation-message domains).
4. Trace records each row id, per-cell boolean, and the applied outputs.

## 4. Governance
Draft → (simulate against recent `rule_audit` contexts) → publish (version++, realtime cache invalidation, audit entry with editor + diff) → retire. Rollback = republish prior version. Only `admin` may publish (per DT-ENT-01 itself — bootstrap: first admin assigned at seed).

## 5. Domain bindings
| Domain | Table(s) | Hit policy | Called by |
|---|---|---|---|
| order_validation | DT-VAL-01, DT-VAL-02 | COLLECT | order-service preview/create |
| pre_trade_risk | DT-RISK-01 | FIRST | order-service |
| market_hours | DT-HRS-01 | FIRST | order-service |
| execution_sim | DT-EXEC-01 | FIRST | matching-runner |
| fees | DT-FEE-01 | ALL | order preview, fills |
| suitability | DT-SUIT-01 | FIRST | profile wizard, order-service |
| entitlements | DT-ENT-01 | FIRST | authorize() everywhere |
| ai_action_policy | DT-AI-01 | FIRST | copilot-orchestrator |
| alerting | DT-ALRT-01 | FIRST | alert-runner, monitor-runner |
| portfolio_analysis | DT-RISK-02 | COLLECT | brief-service (Portfolio Health) |
| market_sim | DT-SIM-01 | ALL | market-tick, news generator |

## 6. Baseline tables (seed content)

### 6.1 DT-VAL-01 · Order validation (COLLECT; defaults: valid)
| # | Condition(s) | decision | reason_code / message |
|---|---|---|---|
| 1 | qty lte 0 | reject | VAL_QTY_POSITIVE "Quantity must be positive." |
| 2 | qty gt 10000 | reject | VAL_QTY_MAX "Max 10,000 shares per order." |
| 3 | order_type in [limit, stop_limit] AND limit_price is_null | reject | VAL_LIMIT_REQUIRED |
| 4 | order_type in [stop, stop_limit] AND stop_price is_null | reject | VAL_STOP_REQUIRED |
| 5 | order_type eq limit AND side eq buy AND limit_price gt last_price*1.05 | warn | VAL_LIMIT_FAR "Limit >5% above market." |
| 6 | instrument_status neq active | reject | VAL_HALTED "Instrument is halted/inactive." |
| 7 | tif eq IOC AND order_type neq limit | reject | VAL_IOC_LIMIT_ONLY |
| 8 | price_not_on_tick eq true | reject | VAL_TICK_SIZE "Price must be a multiple of tick size." |

### 6.2 DT-VAL-02 · Group orders (COLLECT; defaults: valid)
| # | Condition(s) | decision | reason_code |
|---|---|---|---|
| 1 | group_type eq bracket AND side eq buy AND tp_price lte entry_ref_price | reject | VAL_TP_ABOVE_ENTRY |
| 2 | group_type eq bracket AND side eq buy AND sl_price gte entry_ref_price | reject | VAL_SL_BELOW_ENTRY |
| 3 | group_type eq bracket AND legs_count neq 3 | reject | VAL_BRACKET_LEGS |
| 4 | trail_type eq percent AND trail_value not between [0.1, 50] | reject | VAL_TRAIL_RANGE |
| 5 | group_type eq oco AND legs_count neq 2 | reject | VAL_OCO_LEGS |

### 6.3 DT-RISK-01 · Pre-trade risk (FIRST; defaults: allow)
| # | Condition(s) | decision | reason_code / params |
|---|---|---|---|
| 1 | order_notional gt buying_power | reject | RISK_BUYING_POWER |
| 2 | order_notional gt 50000 | reject | RISK_MAX_NOTIONAL (max=50000) |
| 3 | position_pct_post gt 25 AND experience_level eq novice | reject | RISK_CONCENTRATION_NOVICE (25%) |
| 4 | position_pct_post gt 40 | reject | RISK_CONCENTRATION (40%) |
| 5 | orders_today gte 100 | reject | RISK_DAILY_ORDER_CAP |
| 6 | instrument_beta_class eq high AND experience_level eq novice AND order_notional gt 5000 | require_ack | RISK_HIGH_BETA_ACK "High-volatility instrument — confirm you understand." |
| 7 | side eq sell AND qty gt position_qty | reject | RISK_NO_SHORTING "Short selling not available in v1." |

### 6.4 DT-HRS-01 · Market hours (FIRST; defaults: allow)
| # | Condition(s) | decision |
|---|---|---|
| 1 | session eq closed AND order_type eq market | reject (HRS_MARKET_CLOSED) |
| 2 | session eq closed AND order_type in [limit, stop, stop_limit] | queue_for_open |
| 3 | session eq open | allow |

### 6.5 DT-EXEC-01 · Execution simulation (FIRST; defaults: slippage 5 bps, liquidity_cap 5% ADV)
| # | Condition(s) | slippage_bps | liquidity_cap_pct_adv |
|---|---|---|---|
| 1 | avg_volume_band eq high | 2 | 10 |
| 2 | avg_volume_band eq medium | 5 | 5 |
| 3 | avg_volume_band eq low | 15 | 2 |
| 4 | order_notional gt 25000 (AND any band) — priority above 1-3 | +5 (adder) | band value |

### 6.6 DT-FEE-01 · Fees (ALL; defaults: commission 0)
| # | Condition(s) | outputs |
|---|---|---|
| 1 | any | commission_usd = 0 (zero-commission model) |
| 2 | side eq sell | sec_fee = notional × 0.0000278; taf = min(qty × 0.000166, 8.30) |
| 3 | account_tier eq pro | data_fee_monthly = 0 (else 4.99, informational) |

### 6.7 DT-AI-01 · AI action policy (FIRST; defaults: require_approval)
| # | Condition(s) | decision | limits |
|---|---|---|---|
| 1 | tool eq propose_order | require_approval | — (orders NEVER auto-approve) |
| 2 | tool in [create_watchlist_item, create_alert] AND actions_today lt 50 | auto_approve | |
| 3 | tool eq create_monitor AND monitors_count lt 20 | auto_approve | |
| 4 | tool eq propose_order AND order_notional gt 50000 | block | AI cannot even propose above hard cap |
| 5 | messages_today gt 200 | rate_limit | "Daily copilot quota reached." |

### 6.8 DT-ENT-01 · Entitlements (FIRST; defaults: deny)
| # | role | action | decision |
|---|---|---|---|
| 1 | trader | trade:*, watchlist:*, alerts:*, copilot:*, portfolio:read, screener:* | allow |
| 2 | admin | rules:*, users:*, audit:read, health:read + all trader actions | allow |
| 3 | compliance | audit:read, rules:read | allow |
| 4 | compliance | trade:* | deny (explicit) |

### 6.9 DT-ALRT-01 · Alert throttling (FIRST; defaults: deliver)
| # | Condition(s) | decision |
|---|---|---|
| 1 | same_rule_fired_within_min lt 15 | suppress |
| 2 | rule_fires_today gte 20 | suppress_and_pause_rule |
| 3 | user_alerts_today gte 100 | suppress |

### 6.10 DT-RISK-02 · Portfolio analysis flags (COLLECT; defaults: none)
| # | Condition(s) | flag |
|---|---|---|
| 1 | max_position_pct gt 25 | CONCENTRATION_POSITION |
| 2 | max_sector_pct gt 40 | CONCENTRATION_SECTOR |
| 3 | portfolio_beta gt 1.4 | HIGH_BETA_TILT |
| 4 | cash_pct gt 30 | CASH_DRAG |
| 5 | positions_count lt 3 AND equity gt 10000 | LOW_DIVERSIFICATION |

### 6.11 DT-SUIT-01 · Suitability tier (FIRST; default: standard)
| # | Condition(s) | suitability_tier |
|---|---|---|
| 1 | experience_level eq novice | conservative |
| 2 | experience_level eq intermediate | standard |
| 3 | experience_level eq advanced | full |

### 6.12 DT-SIM-01 · Market simulation params (ALL; defaults: normal regime)
| # | Condition(s) | outputs |
|---|---|---|
| 1 | any | gap_event_prob_per_day = 0.02; gap_range_pct = [1,6] |
| 2 | beta_class eq high | vol_multiplier = 1.8 |
| 3 | beta_class eq low | vol_multiplier = 0.6 |
| 4 | news_sentiment_shock eq true | drift_nudge_bps = sentiment × 30 (1 bar) |

## 7. Engine test fixtures (normative for PBI-010)
1. **FIRST + priority:** context matching rows 2 and 4 of DT-RISK-01 ⇒ row 2 outcome only.
2. **COLLECT:** DT-VAL-01 with qty=0 and null limit on a limit order ⇒ both reject messages returned.
3. **ALL merge:** DT-FEE-01 sell for pro user ⇒ commission 0 + sec/taf + data_fee 0 merged.
4. **Defaults:** DT-ENT-01 with unknown role ⇒ deny.
5. **between:** trail_value 0.05 ⇒ VAL_TRAIL_RANGE; 0.1 ⇒ valid (inclusive bounds).
6. **Effective dating:** row with `effective_to` = yesterday must not match with today's clock.
7. **any operator:** DT-FEE-01 row 1 matches every context.
8. **Trace:** evaluation of fixture 1 exposes row-level condition booleans for all rows.

## 8. Change management examples
- Raise novice concentration to 30%: edit DT-RISK-01 row 3 in draft → simulate vs last 30 days of order audits (console shows how many past rejections would now pass) → publish. No deploy.
- Enable after-hours limit queueing: DT-HRS-01 already queues; to reject instead, change row 2 decision. One cell.
- Tighten AI: set DT-AI-01 row 2 to require_approval — copilot watchlist adds now need clicks. One cell.
