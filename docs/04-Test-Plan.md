# Meridian — Test Plan

**Version:** 1.0 | **Date:** 2026-07-03

## 1. Strategy
- **Unit (Vitest):** all pure logic — rules engine, paper engine, indicators, P&L math, parsers, generators. Target ≥ 90% branch coverage on `packages/*`.
- **Integration:** edge functions against a dev InsForge environment with seeded data; fake LLM for copilot determinism.
- **E2E (Playwright):** user journeys on seeded mock data with the feed in **deterministic test mode** (seeded RNG + controllable via feature_flags: pause/step/force-price).
- **Traceability:** every PBI → ACs (`AC-<PBI>-nn`) → TCs (`TC-<PBI>-nn`). Priority P0 = release gate (PBI-031 suite), P1 = must pass before phase exit, P2 = nice-to-have.
- **Status column:** agents update Status (☐ pending / ☑ pass) when the tagged test passes in CI.

## 2. Test environment
Seeded via `scripts/seed-all.ts` (see doc 06): 150 instruments, 5y daily + 5d 1m bars, baseline rule tables, 500 news items, fundamentals, demo users `demo.trader@meridian.test` (trader), `demo.admin@meridian.test` (admin), `demo.compliance@meridian.test` (compliance), each password `Meridian!Demo1`, trader pre-loaded with 6-position portfolio (doc 06 §5).

## 3. Acceptance Criteria & Test Cases

### PBI-001 Monorepo scaffold & CI
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-001-01 | `pnpm build`, `pnpm test`, `pnpm lint` pass from clean clone | P0 | ☐ |
| AC-001-02 | CI runs typecheck+lint+test on PR and fails on introduced type error | P1 | ☐ |
| TC-001-01 | Clean clone → install → build/test/lint all green (AC-001-01) | P0 | ☐ |
| TC-001-02 | PR with deliberate type error → CI red (AC-001-02) | P1 | ☐ |

### PBI-002 InsForge baseline
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-002-01 | Migrations apply idempotently; re-run is a no-op | P0 | ☐ |
| AC-002-02 | RLS: user A cannot read user B's account/profile rows | P0 | ☐ |
| AC-002-03 | audit_log rejects UPDATE/DELETE | P0 | ☐ |
| TC-002-01 | Apply 0001 twice → second run no-op (AC-002-01) | P0 | ☐ |
| TC-002-02 | Query accounts with user-A JWT → only A's rows; B's id → 0 rows (AC-002-02) | P0 | ☐ |
| TC-002-03 | UPDATE audit_log → error raised (AC-002-03) | P0 | ☐ |

### PBI-003 Terminal shell
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-003-01 | Panels open/close/resize/drag-dock; layout survives reload | P0 | ☑ |
| AC-003-02 | Status bar clock reflects NYSE session state | P1 | ☑ |
| AC-003-03 | Reset layout restores defaults | P2 | ☑ |
| TC-003-01 | Resize+move panel, reload → layout identical (AC-003-01) | P0 | ☑ |
| TC-003-02 | Mock clock inside/outside session → OPEN/CLOSED shown (AC-003-02) | P1 | ☑ |
| TC-003-03 | Reset → default layout (AC-003-03) | P2 | ☑ |

### PBI-004 Auth & profiles
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-004-01 | Signup → wizard → workspace; paper account created with $100,000 exactly once | P0 | ☑ |
| AC-004-02 | /workspace unauthenticated → redirect to /login; session survives reload | P0 | ☑ |
| AC-004-03 | OAuth (Google) login works in dev | P1 | ☑ |
| TC-004-01 | E2E signup flow; DB has 1 account @ $100k; re-login doesn't duplicate (AC-004-01) | P0 | ☑ |
| TC-004-02 | Direct nav to /workspace logged out → /login; login → reload stays in (AC-004-02) | P0 | ☑ |
| TC-004-03 | OAuth stub flow completes (AC-004-03) | P1 | ☑ |

### PBI-005 Instruments & seed
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-005-01 | 150 instruments seeded; symbols unique; all fields populated | P0 | ☐ |
| AC-005-02 | Each instrument: ≥1250 daily bars, 1950 1m bars (5 days × 390) | P0 | ☐ |
| AC-005-03 | Generator deterministic: same seed → identical bars | P0 | ☐ |
| TC-005-01 | SQL count checks post-seed (AC-005-01/02) | P0 | ☐ |
| TC-005-02 | Run generator twice with seed 42 → deep-equal output (AC-005-03) | P0 | ☐ |

### PBI-006 Mock feed
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-006-01 | quotes_latest updates while calendar OPEN; frozen when CLOSED or paused | P0 | ☐ |
| AC-006-02 | Tick batches on realtime ≤ 4/sec; 1m bars roll correctly | P0 | ☐ |
| AC-006-03 | Test mode: force-price flag moves a symbol to target within one batch | P0 | ☐ |
| TC-006-01 | Pause flag on → no quote changes for 10s; off → resumes (AC-006-01) | P0 | ☐ |
| TC-006-02 | Subscribe 30s → batch rate ≤4/s; bar boundaries correct (AC-006-02) | P1 | ☐ |
| TC-006-03 | Force AAPL→200.00 → quotes_latest reflects it (AC-006-03) | P0 | ☐ |

### PBI-007 Watchlist & realtime client
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-007-01 | CRUD watchlists/items; unique constraint prevents dupes | P0 | ☐ |
| AC-007-02 | Rows tick live with flash; ≤4 renders/sec under load | P0 | ☐ |
| AC-007-03 | Row click sets symbolContext consumed by other panels | P0 | ☐ |
| TC-007-01 | Create list, add AAPL twice → one row + friendly error (AC-007-01) | P0 | ☐ |
| TC-007-02 | Force price change → row value + flash update (AC-007-02) | P0 | ☐ |
| TC-007-03 | Click MSFT row → context readout = MSFT (AC-007-03) | P0 | ☐ |

### PBI-008 Chart
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-008-01 | Candles render for all ranges; 1D uses 1m data | P0 | ☐ |
| AC-008-02 | Live tick updates current candle | P1 | ☐ |
| AC-008-03 | Indicator values match fixture math (SMA/EMA/VWAP/RSI) | P0 | ☐ |
| AC-008-04 | Rapid symbol switching never renders stale symbol's data | P1 | ☐ |
| TC-008-01 | E2E: GIP MSFT, cycle ranges, no errors (AC-008-01) | P0 | ☐ |
| TC-008-02 | Unit: indicators vs known vectors (AC-008-03) | P0 | ☐ |
| TC-008-03 | Force tick → last candle close updates (AC-008-02) | P1 | ☐ |
| TC-008-04 | Switch symbols 5× fast → final chart = final symbol (AC-008-04) | P1 | ☐ |

### PBI-009 Command palette
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-009-01 | All function codes route to correct panel with context set | P0 | ☐ |
| AC-009-02 | Parser handles bad input gracefully (no crash, hint shown) | P1 | ☐ |
| TC-009-01 | Unit: parser table of 20 inputs (AC-009-01/02) | P0 | ☐ |
| TC-009-02 | E2E: "DES NVDA", "NEWS TSLA", "AI hello" route correctly (AC-009-01) | P0 | ☐ |

### PBI-010 Rules engine package
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-010-01 | All operators & hit policies behave per doc 05 §3 | P0 | ☐ |
| AC-010-02 | Effective dating filters rows by injected clock | P0 | ☐ |
| AC-010-03 | Trace contains per-row condition results for every evaluation | P0 | ☐ |
| TC-010-01 | Fixture tables doc 05 §7: all vectors pass (AC-010-01) | P0 | ☐ |
| TC-010-02 | Row expiring yesterday not matched today (AC-010-02) | P0 | ☐ |
| TC-010-03 | Trace snapshot test (AC-010-03) | P1 | ☐ |

### PBI-011 Rules service
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-011-01 | evaluateDomain returns outcome + writes rule_audit with table version | P0 | ☐ |
| AC-011-02 | Publish invalidates cache without redeploy (< 5 s) | P0 | ☐ |
| AC-011-03 | Baseline tables seeded and published | P0 | ☐ |
| TC-011-01 | Evaluate order_validation → audit row matches outcome (AC-011-01) | P0 | ☐ |
| TC-011-02 | Edit+publish threshold → next eval uses new value (AC-011-02) | P0 | ☐ |
| TC-011-03 | Seed script → all doc 05 §6 tables present/published (AC-011-03) | P0 | ☐ |

### PBI-012 Rules admin console
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-012-01 | Draft edit → diff → publish bumps version; history rollback works | P0 | ☐ |
| AC-012-02 | Simulation replays audits and reports deltas | P1 | ☐ |
| AC-012-03 | Non-admin gets 403 / no UI | P0 | ☐ |
| TC-012-01 | E2E: edit DT-RISK-01 max_order_notional, simulate, publish, verify effect (AC-012-01/02) | P0 | ☐ |
| TC-012-02 | Trader role hits /admin/rules → denied (AC-012-03) | P0 | ☐ |

### PBI-013 Order ticket
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-013-01 | Preview shows rule pass/fail with reasons + fee estimate live | P0 | ☐ |
| AC-013-02 | Submit disabled until preview passes; confirm modal accurate | P0 | ☐ |
| AC-013-03 | Notional↔shares conversion correct at live price | P1 | ☐ |
| TC-013-01 | Oversized qty → DT-RISK-01 reason rendered; fix → submit enabled (AC-013-01/02) | P0 | ☐ |
| TC-013-02 | Confirm modal totals = preview response (AC-013-02) | P0 | ☐ |
| TC-013-03 | $1000 notional at forced $200 price → 5 shares (AC-013-03) | P1 | ☐ |

### PBI-014 Order service
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-014-01 | FSM: only legal transitions possible; illegal → error | P0 | ☐ |
| AC-014-02 | Buying power reserved atomically; concurrent orders can't overspend | P0 | ☐ |
| AC-014-03 | Rejections store reject_reason + rule_audit_id | P0 | ☐ |
| AC-014-04 | Market-closed orders handled per DT-HRS-01 (queue or reject) | P0 | ☐ |
| TC-014-01 | Unit: FSM transition matrix (AC-014-01) | P0 | ☐ |
| TC-014-02 | Two parallel orders totalling > cash → one rejected (AC-014-02) | P0 | ☐ |
| TC-014-03 | Insufficient-funds order → rejected w/ audit link (AC-014-03) | P0 | ☐ |
| TC-014-04 | Order while CLOSED → outcome per published DT-HRS-01 (AC-014-04) | P0 | ☐ |

### PBI-015 Paper matching engine
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-015-01 | Market fills at tick ± slippage per DT-EXEC-01 | P0 | ☐ |
| AC-015-02 | Limit fills only when marketable, never through limit | P0 | ☐ |
| AC-015-03 | Stops trigger correctly incl. gap-through | P0 | ☐ |
| AC-015-04 | Partial fills respect liquidity band; position avg cost & realized P&L correct | P0 | ☐ |
| AC-015-05 | Cash/positions/executions consistent after every fill (invariant) | P0 | ☐ |
| TC-015-01 | Unit suite: each order type × price paths (AC-015-01..03) | P0 | ☐ |
| TC-015-02 | Unit: buy 100@10, buy 100@20 → avg 15; sell 100@25 → realized +1000 (AC-015-04) | P0 | ☐ |
| TC-015-03 | Integration: limit buy below market, force cross → fills (AC-015-02) | P0 | ☐ |
| TC-015-04 | Invariant check: equity = cash + Σ(qty×last) after fill storm (AC-015-05) | P0 | ☐ |

### PBI-016 Advanced orders
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-016-01 | Bracket: entry fill activates TP+SL; either child fill cancels sibling | P0 | ☐ |
| AC-016-02 | Trailing stop ratchets, never loosens, triggers on pullback | P0 | ☐ |
| AC-016-03 | OCO same-tick race deterministic (stop priority) | P0 | ☐ |
| TC-016-01 | E2E: bracket → force through TP → TP filled, SL cancelled (AC-016-01) | P0 | ☐ |
| TC-016-02 | Unit: price path up-down → HWM correct, trigger at trail (AC-016-02) | P0 | ☐ |
| TC-016-03 | Unit: tick hits both legs → stop wins (AC-016-03) | P0 | ☐ |

### PBI-017 Blotter
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-017-01 | Live status updates without reload; group tree renders legs | P0 | ☐ |
| AC-017-02 | Cancel/modify actions respect FSM; reject rows show Explain trace | P0 | ☐ |
| AC-017-03 | Filters + CSV export reflect current view | P1 | ☐ |
| TC-017-01 | Place → working → cancel from blotter → cancelled live (AC-017-01/02) | P0 | ☐ |
| TC-017-02 | Rejected order → Explain popover shows matched rule rows (AC-017-02) | P0 | ☐ |
| TC-017-03 | Filter symbol → export CSV rows match grid (AC-017-03) | P1 | ☐ |

### PBI-018 Portfolio & P&L
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-018-01 | Position rows & header KPIs revalue on ticks | P0 | ☐ |
| AC-018-02 | P&L math matches fixtures (unrealized, day, realized) | P0 | ☐ |
| AC-018-03 | Close action prefills opposite order; snapshot cron writes daily row | P1 | ☐ |
| TC-018-01 | Unit: P&L fixtures incl. partial-fill lots (AC-018-02) | P0 | ☐ |
| TC-018-02 | E2E: fill buy, force +5% → unrealized ≈ +5% (AC-018-01) | P0 | ☐ |
| TC-018-03 | Close 10-share position → ticket prefilled SELL 10 MKT (AC-018-03) | P1 | ☐ |

### PBI-019 News
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-019-01 | Stream renders live items; symbol filter follows context | P0 | ☐ |
| AC-019-02 | Sentiment badge maps score → color scale; detail drawer opens | P1 | ☐ |
| TC-019-01 | E2E: NEWS TSLA → only TSLA-tagged items (AC-019-01) | P0 | ☐ |
| TC-019-02 | Unit: generator determinism + template fill (AC-019-01) | P1 | ☐ |

### PBI-020 Fundamentals/DES
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-020-01 | DES renders all stat groups for every seeded instrument (no missing-field crashes) | P0 | ☐ |
| AC-020-02 | Peer click switches symbolContext | P1 | ☐ |
| TC-020-01 | E2E: DES NVDA renders; property test: render 20 random instruments (AC-020-01) | P0 | ☐ |
| TC-020-02 | Peer strip click → context change (AC-020-02) | P1 | ☐ |

### PBI-021 Screener
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-021-01 | Criteria compile to parameterized SQL; injection attempts fail safely | P0 | ☐ |
| AC-021-02 | Results correct for known fixture criteria; save/load round-trips | P0 | ☐ |
| AC-021-03 | Add-to-watchlist adds all result rows | P1 | ☐ |
| TC-021-01 | Unit: compiler incl. `'; DROP TABLE` inputs (AC-021-01) | P0 | ☐ |
| TC-021-02 | "Tech, P/E<20, div>1%" → matches SQL oracle query (AC-021-02) | P0 | ☐ |
| TC-021-03 | Save, reload, run → same criteria/results (AC-021-02) | P1 | ☐ |

### PBI-022 Alerts
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-022-01 | Price-cross alert fires exactly once per DT-ALRT-01 throttle | P0 | ☐ |
| AC-022-02 | Toast + unread badge + history row on fire; disable stops firing | P0 | ☐ |
| TC-022-01 | E2E: create cross alert, force price past → one toast, badge=1; force again within throttle → still 1 (AC-022-01/02) | P0 | ☐ |
| TC-022-02 | Disabled alert + trigger condition → nothing fires (AC-022-02) | P1 | ☐ |

### PBI-023 RAG
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-023-01 | New news items embedded within one worker cycle; backfill completes | P0 | ☐ |
| AC-023-02 | 5 canned semantic queries rank fixture item first | P0 | ☐ |
| AC-023-03 | Gateway failure → retry then dead-letter, no crash | P1 | ☐ |
| TC-023-01 | Insert item → embedding row appears (AC-023-01) | P0 | ☐ |
| TC-023-02 | Canned-query ranking suite (AC-023-02) | P0 | ☐ |
| TC-023-03 | Simulate gateway 500 → dead-letter row (AC-023-03) | P1 | ☐ |

### PBI-024 Entitlements
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-024-01 | Role × endpoint matrix enforced per DT-ENT-01, deny-by-default | P0 | ☐ |
| AC-024-02 | Publishing an entitlement change alters behavior without deploy | P0 | ☐ |
| TC-024-01 | Matrix test: 3 roles × protected endpoints (AC-024-01) | P0 | ☐ |
| TC-024-02 | Flip compliance→rules:write in draft, publish, retest (AC-024-02) | P0 | ☐ |

### PBI-025 Copilot chat
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-025-01 | Streams answers; tool calls visible; citations link to sources | P0 | ☐ |
| AC-025-02 | Price/portfolio claims come from tool results (fake-LLM harness asserts no un-tooled figures) | P0 | ☐ |
| AC-025-03 | Rate limit per DT-AI-01 enforced; sessions persist | P1 | ☐ |
| TC-025-01 | E2E: "summarize AAPL news" → cited response (AC-025-01) | P0 | ☐ |
| TC-025-02 | Fake-LLM transcript tests: loop terminates ≤8 calls, tool errors surfaced (AC-025-02) | P0 | ☐ |
| TC-025-03 | Exceed rate limit → friendly refusal (AC-025-03) | P1 | ☐ |

### PBI-026 Copilot actions
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-026-01 | Orders NEVER execute without explicit approval (policy DT-AI-01) | P0 | ☐ |
| AC-026-02 | Approved actions run through the same services (trade rules still apply, may still reject) | P0 | ☐ |
| AC-026-03 | Auto-approved classes (watchlist add) execute immediately and are audited | P1 | ☐ |
| TC-026-01 | "buy 10 AAPL" → proposed card; DB assert no order row pre-approval (AC-026-01) | P0 | ☐ |
| TC-026-02 | Approve an order violating DT-RISK-01 → rejected with rule reason (AC-026-02) | P0 | ☐ |
| TC-026-03 | "add NVDA to watchlist" → immediate + audit row (AC-026-03) | P1 | ☐ |

### PBI-027 Monitors
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-027-01 | 10 golden NL instructions compile to expected condition JSON | P0 | ☐ |
| AC-027-02 | Trigger fires once (throttled) with data-grounded explanation | P0 | ☐ |
| AC-027-03 | Pause stops evaluation; plain-English rendering matches condition | P1 | ☐ |
| TC-027-01 | Compiler golden suite (AC-027-01) | P0 | ☐ |
| TC-027-02 | Portfolio-drop monitor + forced -6% → single alert w/ explanation (AC-027-02) | P0 | ☐ |
| TC-027-03 | Paused monitor + trigger → silence (AC-027-03) | P1 | ☐ |

### PBI-028 Briefs
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-028-01 | All three brief kinds generate with citations; PDF export downloads | P1 | ☐ |
| AC-028-02 | Portfolio Health numeric claims exactly equal rules output (no hallucinated figures) | P0 | ☐ |
| TC-028-01 | Generate each kind on demo portfolio → renders, PDF link works (AC-028-01) | P1 | ☐ |
| TC-028-02 | Parse brief numbers vs DT-RISK-02 audit output → equal (AC-028-02) | P0 | ☐ |

### PBI-029 Audit completion
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-029-01 | Hash chain verifies; tampering detected | P0 | ☐ |
| AC-029-02 | Every mutating endpoint writes an audit row | P0 | ☐ |
| AC-029-03 | Compliance role: read-only audit access; trader: none | P0 | ☐ |
| TC-029-01 | Tamper row in test DB → verify fails (AC-029-01) | P0 | ☐ |
| TC-029-02 | Mutation sweep test (AC-029-02) | P0 | ☐ |
| TC-029-03 | Role access checks on /admin/audit (AC-029-03) | P0 | ☐ |

### PBI-030 Observability & performance
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-030-01 | Panel crash isolated (workspace survives); STALE watermark on feed gap | P1 | ☐ |
| AC-030-02 | order /preview p95 < 300 ms @ 50 rps; workspace TTI < 3 s (CI profile) | P1 | ☐ |
| TC-030-01 | Throw in panel dev hook → other panels alive, error reported (AC-030-01) | P1 | ☐ |
| TC-030-02 | k6 + Lighthouse CI budgets green (AC-030-02) | P1 | ☐ |

### DOC Knowledge-base process (not a product PBI)
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-DOC-01 | `feat(PBI-NNN)` commits include `docs/kb/as-built/PBI-NNN.md` with required headings and no TBD sections | P1 | ☑ |
| AC-DOC-02 | `pnpm docs:generate` snapshots under `docs/kb/generated/` are current in CI | P1 | ☑ |
| TC-DOC-01 | `pnpm docs:kb-check` and `node --test scripts/check-kb.test.mjs` pass (AC-DOC-01) | P1 | ☑ |
| TC-DOC-02 | `pnpm docs:generate` then git working tree clean for `docs/kb/generated` (AC-DOC-02) | P1 | ☑ |

### PBI-031 Regression suite
| ID | Criterion / Test | Pri | Status |
|---|---|---|---|
| AC-031-01 | All P0 TCs automated, tagged with TC ids, green on seeded env in CI | P0 | ☐ |
| AC-031-02 | RELEASE.md runbook executes end-to-end | P0 | ☐ |
| TC-031-01 | CI release-gate job green (AC-031-01) | P0 | ☐ |
| TC-031-02 | Fresh env: runbook steps → deployable build (AC-031-02) | P0 | ☐ |

## 4. Traceability summary
Every PBI-nnn maps 1:N to AC-nnn-xx, each AC maps 1:N to TC-nnn-xx (embedded above — single source of truth). Playwright specs carry `@TC-nnn-xx` tags; CI publishes a traceability report by grepping tags against this document. A PBI is **Done** only when: code merged, its P0/P1 TCs pass, and Status boxes here are ticked by the agent in the same PR.
