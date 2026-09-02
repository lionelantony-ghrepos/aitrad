# Meridian — Product Requirements Document (PRD)
## PBIs in Build Order, with Cursor Prompts

**Version:** 1.0 | **Date:** 2026-07-03
Each PBI has a unique ID, dependencies, and a ready-to-paste Cursor prompt. Build strictly in order (dependencies are chronological). Acceptance Criteria & Test Cases: see `04-Test-Plan.md` (IDs `AC-<PBI>-nn`, `TC-<PBI>-nn`).

**Before PBI-001:** install the InsForge MCP server in Cursor and connect the project, so the agent can run migrations/deploy functions directly. Add `.cursor/rules/` from `07-Agent-Build-Guide.md`.

**Prompt preamble (prepend to EVERY prompt):**
> You are building Meridian, an AI-native trading terminal (paper trading, US equities). Obey `.cursor/rules/`. Read `docs/02-Technical-Architecture-Blueprint.md`, `docs/05-Business-Rules-and-Decision-Tables.md`, `docs/kb/INDEX.md`, and as-built pages for this PBI’s dependencies before coding. TypeScript strict, Zod-validate all boundaries, no business logic hard-coded in components — logic lives in decision tables or packages. Write Vitest unit tests for every module and update the traceability table in `docs/04-Test-Plan.md` status column when tests pass. Fill `docs/kb/as-built/PBI-00X.md` from `docs/kb/_template-as-built.md` in the same commit (do not rewrite docs 01–06). Patch `docs/08` only if user-visible UI shipped.

---

## Phase 0 — Scaffolding & Framework

### PBI-001 · Monorepo scaffold & CI
**Deps:** none. **Description:** pnpm + Turborepo monorepo per repo layout in Architecture §10; Next.js 15 app with strict TS, Tailwind, shadcn/ui, ESLint/Prettier/Husky; GitHub Actions CI (typecheck, lint, test); empty packages `schemas`, `rules-engine`, `paper-engine`, `mock-data`.
**Cursor prompt:**
```
Create the Meridian monorepo: pnpm workspaces + Turborepo with apps/web (Next.js 15 App Router,
TypeScript strict, Tailwind, shadcn/ui initialized with a dark theme), and empty packages:
@meridian/schemas, @meridian/rules-engine, @meridian/paper-engine, @meridian/mock-data — each with
tsconfig, vitest config, and a passing placeholder test. Add ESLint (typescript-eslint strict),
Prettier, Husky + lint-staged, and a GitHub Actions workflow running typecheck, lint, and test on PR.
Add turbo.json pipelines for build/test/lint. Wire GitHub Actions to also run `pnpm docs:kb-check` and `pnpm docs:generate` (fail if generated snapshots are stale). Verify: pnpm build && pnpm test pass from repo root.
```

### PBI-002 · InsForge backend baseline & migrations framework
**Deps:** 001. **Description:** InsForge project wired via MCP; `insforge/migrations` SQL framework; core tables from Architecture §3 (users/profiles/accounts/instruments/audit_log/feature_flags) with RLS; typed API client in `apps/web/lib/api` wrapping InsForge auto-REST behind a repository interface.
**Cursor prompt:**
```
Using the InsForge MCP, initialize the backend: create insforge/migrations with numbered SQL files and
a README on how migrations run. Migration 0001: profiles, accounts (paper cash balance, currency),
instruments, audit_log (append-only: revoke UPDATE/DELETE via trigger), feature_flags — UUID PKs,
created_at/updated_at triggers, RLS policies (owner-only on user tables; instruments public-read).
Generate matching Zod schemas in @meridian/schemas. In apps/web/lib/api create a Repository layer
(one module per entity) wrapping InsForge REST — no direct SDK calls outside this layer. Unit-test
schema parsing and repository URL construction with MSW.
```

### PBI-003 · Terminal shell, theming & panel system
**Deps:** 001. **Description:** Bloomberg-style workspace: resizable/dockable panel grid (use `react-mosaic` or `dockview`), dark terminal theme (near-black, amber/cyan accents, dense mono numerics), top command bar, status bar (market clock, connection), panel registry, layout persistence (localStorage v1).
**Cursor prompt:**
```
Build the terminal shell in apps/web: a workspace page with a dockable panel system using dockview.
Create a PanelRegistry (id, title, icon, component, defaultSize) and register placeholder panels:
Chart, Watchlist, OrderTicket, Blotter, News, Screener, Portfolio, Copilot. Implement the Meridian
design system: near-black background (#0a0e14), amber (#ffb000) and cyan accents, tabular-nums
monospace for figures, green/red semantic tokens for up/down, high-density 4px spacing scale — as
Tailwind theme tokens. Add top command bar (placeholder), bottom status bar with live market clock
(America/New_York, shows OPEN/CLOSED from a hardcoded calendar for now) and connection dot. Persist
layout to localStorage with versioned schema; "Reset layout" action. Keyboard: Ctrl+K opens palette
placeholder. Playwright smoke test: open workspace, drag-resize a panel, reload, layout persists.
```

### PBI-004 · Authentication & profiles
**Deps:** 002, 003. **Description:** InsForge auth (email/password + Google OAuth), session handling, protected workspace route, profile setup wizard (display name, experience level, suitability tier — stored for rules), paper account auto-provisioned with $100,000.
**Cursor prompt:**
```
Wire InsForge Auth into apps/web: email/password and Google OAuth, /login and /signup pages in the
terminal aesthetic, JWT session with refresh, route guard on /workspace. On first login create
profile + paper account ($100,000 USD) via an insforge edge function `provision-account` (idempotent).
Profile wizard collects display_name, experience_level (novice|intermediate|advanced), objectives —
persist to profiles; suitability_tier computed later by rules (store null). Add user menu with
logout. Tests: Vitest for provision idempotency logic; Playwright: signup → wizard → workspace,
reload keeps session, logout redirects.
```

---

## Phase 1 — Market Data & Watchlists

### PBI-005 · Instrument master & mock universe seed
**Deps:** 002. **Description:** `instruments` populated with 150-symbol mock US universe (see `06-Mock-Data-and-Seeding.md`); `@meridian/mock-data` generators; seed script runnable via InsForge MCP/CLI.
**Cursor prompt:**
```
Implement @meridian/mock-data per docs/06-Mock-Data-and-Seeding.md: load mock-data/instruments.json
(150 US equities/ETFs with symbol, name, exchange, sector, industry, market_cap_band, beta_class,
tick_size, lot_size, avg_volume, base_price). Write scripts/seed.ts that upserts instruments into
InsForge (idempotent, batched). Add migration 0002: market_bars (instrument_id, timeframe 1m|1d, ts,
o/h/l/c/v, PK(instrument_id,timeframe,ts)) and quotes_latest (instrument_id PK, bid, ask, last, prev_close,
volume, ts). Generate 5 years of daily bars + 5 trading days of 1-minute bars per instrument using the
geometric-Brownian generator in the doc (seeded RNG => deterministic). Seed them. Verify counts with a
SQL check in the script output.
```

### PBI-006 · Mock market feed (tick engine)
**Deps:** 005. **Description:** `market-tick` edge function on a schedule (or long-poll loop) advancing prices per instrument (GBM + regime/beta from mock-data config, respects market hours calendar), updates `quotes_latest`, appends 1m bars, publishes batched ticks to realtime channel `quotes`.
**Cursor prompt:**
```
Create insforge/functions/market-tick: every second of simulated time (run on the platform's minimum
schedule; batch N simulated ticks per invocation), evolve each instrument's price using the seeded GBM
params from @meridian/mock-data (volatility by beta_class, occasional gap events per DT-SIM-01 decision
table defaults), only while the market-hours calendar says OPEN (add calendar table + migration, seed
NYSE 2026 sessions incl. half-days). Write quotes_latest, roll 1-minute bars, publish coalesced tick
batches (max 4/sec) to realtime channel "quotes". Add a `speed` and `paused` control row in
feature_flags so tests can freeze the feed. Unit-test the GBM stepper and bar-roll logic in
@meridian/mock-data (pure functions).
```

### PBI-007 · Realtime quote client & Watchlist panel
**Deps:** 003, 006. **Description:** realtime subscription hook; Watchlist panel: CRUD watchlists, add/remove symbols with typeahead, live last/bid/ask/change%/sparkline, sort, flash-on-tick, sets shared `symbolContext` on click.
**Cursor prompt:**
```
Implement useQuotes(symbols[]) hook subscribing to the InsForge realtime "quotes" channel with
coalesced state updates (max 4 renders/sec), and a Zustand symbolContext store (activeSymbol, setter).
Migration 0003: watchlists + watchlist_items (RLS owner-only, unique(watchlist_id, instrument_id)).
Build the Watchlist panel: multiple named lists (tabs), symbol typeahead search (instruments), rows
with last, net chg, %chg, bid/ask, volume, 30-point sparkline; green/red flash animation on tick;
column sort; row click sets symbolContext; remove via context menu. Persist selected list per layout.
Tests: Vitest for coalescing logic; Playwright: create list, add AAPL, see live updates (feed in test
mode), click row updates a debug context readout.
```

### PBI-008 · Chart panel
**Deps:** 007. **Description:** TradingView Lightweight Charts candlestick panel bound to `symbolContext`: 1D/1W/1M/1Y/5Y ranges, 1m/1d resolutions, volume histogram, SMA/EMA/VWAP/RSI overlays, crosshair OHLCV readout, live-updating last candle from ticks.
**Cursor prompt:**
```
Build the Chart panel with lightweight-charts: candlesticks + volume histogram; loads market_bars for
symbolContext.activeSymbol with range switcher (1D uses 1m bars; 1W-5Y use 1d bars); streams
quotes_latest ticks into the current candle. Indicator toolbar: SMA(20/50/200), EMA(12/26), VWAP,
RSI(14) in a sub-pane — implement indicator math as pure functions in @meridian/schemas/analytics or a
new @meridian/indicators module with full unit tests against known fixture values. Crosshair legend
shows OHLCV + indicator values. Handle empty data and symbol switch race conditions (abort stale
fetches). Playwright: switch symbol from watchlist, chart retargets; toggle RSI pane.
```

### PBI-009 · Command palette & function codes
**Deps:** 007. **Description:** Ctrl+K palette with Bloomberg-style functions: `DES <sym>` (description page), `GIP <sym>` (chart), `WL` (watchlist), `NEWS <sym>`, `ORD <sym>` (ticket), `PORT`, `SCR`, `AI <question>`; fuzzy symbol search; recent commands; opens/focuses panels and sets context.
**Cursor prompt:**
```
Implement the command palette (cmdk): Ctrl+K opens; parses "<FUNC> <ARG>" grammar with functions
DES, GIP, NEWS, ORD, WL, PORT, SCR, AI plus bare-symbol fuzzy search over instruments. Executing a
function opens/focuses the mapped panel via PanelRegistry and sets symbolContext (AI passes the query
to the Copilot panel input). Show recents (localStorage) and keyboard-only navigation. Register a
FunctionRouter so future PBIs add functions declaratively. Unit-test the parser exhaustively
(valid/invalid/edge inputs). Playwright: "GIP MSFT" focuses chart on MSFT.
```

---

## Phase 2 — Rules Engine & Governance Core

### PBI-010 · Decision-table engine (`@meridian/rules-engine`)
**Deps:** 002. **Description:** portable evaluator per doc 05: table model (inputs, conditions with operators, outputs, hit policies first/all/collect, priority), versioning, effective dating; pure TS, zero I/O; compile-and-evaluate API; full unit coverage against doc 05 fixture tables.
**Cursor prompt:**
```
Implement @meridian/rules-engine exactly per docs/05-Business-Rules-and-Decision-Tables.md §2 (schema)
and §3 (semantics): DecisionTable/DecisionRow Zod types; operators eq, neq, lt, lte, gt, gte, in,
not_in, between, regex, is_null, any; hit policies FIRST (priority order), ALL, COLLECT; typed outputs
with defaults; effective_from/to filtering; evaluate(table, context) returns {outcome, matchedRows,
trace} where trace lists every row's condition results (for audit). No I/O, no Date.now() (clock is a
parameter). Achieve 100% branch coverage with the fixture tables in doc 05 §7 as test vectors.
```

### PBI-011 · Rules storage, service & cache
**Deps:** 010. **Description:** migrations for `rule_sets/decision_tables/decision_rows/rule_bindings/rule_audit`; `rules-service` edge function: load published tables, evaluate on demand (internal RPC for other functions), write `rule_audit`; publish/invalidate via realtime; seed the doc 05 baseline tables.
**Cursor prompt:**
```
Migration 0004: rule_sets, decision_tables (status draft|published|retired, version, hit_policy,
effective dates), decision_rows (jsonb conditions/outputs, priority), rule_bindings (domain →
table id), rule_audit (evaluation snapshot: table version, context, matched rows, outcome, latency_ms;
append-only). Create insforge/functions/rules-service exposing evaluateDomain(domain, context):
loads published tables for the domain binding (in-memory cache, invalidated by realtime message
"rules:published"), runs @meridian/rules-engine, writes rule_audit, returns outcome+auditId. Seed all
baseline tables from docs/05 §6 via scripts/seed-rules.ts (idempotent). Integration test with the
InsForge local/dev environment: publish a table edit, cache refreshes, evaluation reflects it.
```

### PBI-012 · Rules Admin console
**Deps:** 011. **Description:** admin-only area: browse rule sets/tables, spreadsheet-like row editor with typed condition cells, draft→publish workflow with diff view, version history, **simulation mode** (run draft table against recent `rule_audit` contexts and show outcome deltas), rule_audit browser.
**Cursor prompt:**
```
Build /admin/rules (entitlement: admin role — gate via entitlements check, PBI-024 hardens this):
table list grouped by domain; editor rendering decision_rows as an editable grid (typed cells per
input: enum dropdowns, numeric ranges, symbol pickers), add/remove/reorder rows (priority drag);
draft version editing with side-by-side diff vs published; Publish action (bumps version, realtime
invalidate); history tab with rollback-to-version; Simulate tab: replay last N rule_audit contexts
through the draft and chart agreement % + row-level deltas; Audit tab: searchable rule_audit viewer
showing full evaluation trace. Playwright: edit a threshold in DT-RISK-01 draft, simulate, publish,
verify next evaluation uses it.
```

---

## Phase 3 — Trading Core

### PBI-013 · Order ticket panel
**Deps:** 009, 011. **Description:** ticket bound to symbolContext: side, qty (shares/notional toggle), type (market/limit/stop/stop-limit), TIF (DAY/GTC/IOC), live est. cost/proceeds incl. simulated fees (from DT-FEE-01 via rules-service preview endpoint), buying-power display, inline pre-trade validation messages, confirm modal with order summary.
**Cursor prompt:**
```
Build the OrderTicket panel: fields side/qty/type/limit_price/stop_price/TIF with Zod validation
mirroring @meridian/schemas OrderDraft; notional↔shares toggle using live last price; shows account
buying power; calls order-service /preview (create the endpoint returning: rules outcome for
DT-VAL-01 + DT-RISK-01, estimated fees from DT-FEE-01, est. total) debounced on change and renders
pass/fail per rule with the human-readable reason from the rules outcome; Submit disabled until
preview passes; confirm modal summarises everything; on submit call order-service /orders. Buy/Sell
color semantics, keyboard: Shift+B / Shift+S prefill side. Playwright: reject path (qty exceeding
max position from DT-RISK-01) shows the rule reason; happy path reaches confirm modal.
```

### PBI-014 · Order service & validation pipeline
**Deps:** 011, 013. **Description:** `order-service` edge function: `/preview` and `/orders` (create), `/orders/:id/cancel`; FSM per Architecture §4; every transition rules-checked (DT-VAL-01, DT-RISK-01, DT-HRS-01 market hours), audited, published to `orders:{userId}`; reserves buying power.
**Cursor prompt:**
```
Migration 0005: orders (FSM status, all price fields, tif, parent_order_id, reject_reason,
rule_audit_id), executions (append-only), positions, portfolio_snapshots — RLS owner-only. Implement
insforge/functions/order-service: POST /preview (rules + fee estimate, no writes except rule_audit);
POST /orders: validate Zod → evaluateDomain('order_validation') → evaluateDomain('pre_trade_risk')
→ evaluateDomain('market_hours') → reserve buying power atomically (SQL function with row lock) →
insert accepted order → publish event → audit_log. POST /orders/:id/cancel with FSM guard (only
working/accepted/partially_filled). Reject path stores reject_reason + rule_audit_id. Unit-test the
FSM transition guard table exhaustively; integration test: insufficient buying power → rejected with
DT-RISK-01 reason.
```

### PBI-015 · Paper matching engine
**Deps:** 006, 014. **Description:** `@meridian/paper-engine` (pure TS) + `matching-runner` function subscribed to ticks: fills working orders (market: next tick with slippage per DT-EXEC-01; limit: cross; stop/stop-limit: trigger), partial fills by liquidity band, writes executions, updates positions (avg cost, realized P&L on sells), releases/settles cash, emits fill events.
**Cursor prompt:**
```
Implement @meridian/paper-engine: pure function match(tick, workingOrders, execConfig) → fills[],
supporting market (fill at tick price ± slippage_bps from execConfig), limit (fill when marketable,
price-improvement at limit), stop & stop-limit (trigger then behave as market/limit), partial fills
when qty > liquidity_cap(avg_volume band). Deterministic given inputs; exhaustive unit tests incl.
gap-through-stop and partial-fill sequencing. Then insforge/functions/matching-runner: on each tick
batch load working orders for ticked instruments, fetch execConfig via
evaluateDomain('execution_sim'), apply fills transactionally: insert executions, update orders
(partially_filled/filled), upsert positions with weighted avg cost + realized_pnl, adjust account
cash, audit_log each fill, publish to orders:{userId} and positions:{userId}. Integration test: limit
buy below market doesn't fill until feed crosses it (use feed test mode).
```

### PBI-016 · Advanced orders: bracket, OCO, trailing stop
**Deps:** 015. **Description:** parent/child order groups: bracket (entry + take-profit + stop-loss), OCO pair, trailing stop (trail % or $, server-side ratchet on ticks); ticket UI extension; group semantics enforced in order-service + matching-runner (fill one leg → manage siblings).
**Cursor prompt:**
```
Extend orders with group_id + leg_role (entry|take_profit|stop_loss|oco_a|oco_b) and trailing fields
(trail_type, trail_value, high_water_mark). Order ticket: "Bracket" tab (entry + TP offset + SL
offset with live prices) and trailing stop type. order-service validates group consistency
(DT-VAL-02 rows added via seed-rules update). matching-runner: entry fill activates children; a
child fill cancels its sibling (OCO semantics); trailing stops ratchet high_water_mark on each tick
and trigger on pullback. Extend @meridian/paper-engine pure logic + unit tests for: bracket entry→TP
fill cancels SL; trailing ratchet never loosens; OCO race on same tick resolves deterministically
(priority: stop before limit). Playwright: place bracket, force feed through TP, blotter shows TP
filled + SL cancelled.
```

### PBI-017 · Blotter (orders & executions panel)
**Deps:** 015. **Description:** virtualized blotter: Working / Filled / All tabs, live status via realtime, cancel/modify actions, execution drill-down, group (bracket) tree rows, filter by symbol/side/status/date, CSV export, reject rows show rule reason with "Explain" link (opens rule_audit trace).
**Cursor prompt:**
```
Build the Blotter panel with TanStack Table (virtualized): tabs Working/Filled/Rejected/All; columns
time, symbol, side, type, qty, filled_qty, avg_fill_px, limit/stop, TIF, status chip, group tree
expander for bracket/OCO legs; live updates from orders:{userId} channel; row actions: Cancel
(working), Modify (reopens ticket prefilled — cancel/replace via order-service), View executions
(drawer with fills list); Rejected rows show reject_reason and an Explain popover rendering the
rule_audit trace fetched by id. Filters (symbol/side/status/date-range) + CSV export of current view.
Playwright: place order, cancel from blotter, status updates without reload.
```

### PBI-018 · Positions, P&L & Portfolio panel
**Deps:** 015. **Description:** Portfolio panel: positions grid (qty, avg cost, last, mkt value, unrealized/realized P&L, day P&L, weight %), account header (equity, cash, buying power, day change), live revaluation on ticks, close-position action, allocation donut (sector/position), equity curve from `portfolio_snapshots` (daily snapshot cron).
**Cursor prompt:**
```
Implement analytics: insforge/functions/analytics-service with /portfolio (positions joined with
quotes_latest → unrealized P&L, day P&L vs prev_close, weights, account equity/cash/buying power) and
a daily snapshot cron writing portfolio_snapshots at market close. Portfolio panel: header KPIs with
live tick revaluation (reuse useQuotes for held symbols), virtualized positions grid with Close
action (prefills opposite market order in ticket), sector & position allocation donuts (Recharts),
equity-curve line chart from snapshots (1M/3M/1Y). P&L math lives in @meridian/schemas/analytics as
pure functions with unit tests (fixtures: partial fills, add-to-position avg cost, sell-half
realized P&L). Playwright: fill a buy in feed test mode, position appears and revalues on next tick.
```

---

## Phase 4 — Intelligence Layer

### PBI-019 · News ingestion & News panel
**Deps:** 005. **Description:** `news_items` table + mock news generator (templated headlines tied to instruments/sectors with sentiment + event_type, from `mock-data/news-templates.json`), `news-ticker` function emitting items on schedule; News panel: live stream, filter by symbol/context, sentiment badges, detail drawer; `NEWS <sym>` palette function.
**Cursor prompt:**
```
Migration 0006: news_items (id, ts, headline, body, source, symbols text[], sector, sentiment
score -1..1, event_type earnings|analyst|macro|product|regulatory|mna). Extend @meridian/mock-data
with a seeded news generator using mock-data/news-templates.json (fills symbol/company/values into
templates, correlates sentiment with a price nudge hook exposed to market-tick via DT-SIM-01 outputs).
Function news-ticker publishes 1-5 items per simulated 5 min to realtime "news". News panel: reverse-
chron virtualized stream, follows symbolContext with an "All markets" toggle, sentiment badge
(color-scaled), event-type chips as filters, click opens detail drawer. Wire NEWS palette function.
Unit-test generator determinism; Playwright: symbol filter shows only tagged items.
```

### PBI-020 · Fundamentals & DES (instrument profile) page
**Deps:** 005, 009. **Description:** `fundamentals` table seeded from mock data (P/E, EPS, revenue, margins, dividend, 52w range, shares out, analyst rating distribution); DES panel: company profile, key stats grid, mini financials bar charts, peers (same industry) with quick-switch, linked to `DES <sym>`.
**Cursor prompt:**
```
Migration 0007: fundamentals (instrument_id PK, jsonb metrics with a Zod-typed shape: valuation,
income, margins, dividends, ranges, analyst {buy,hold,sell}, updated_at). Seed from
mock-data/fundamentals.json (generated per instrument from sector-plausible ranges, seeded RNG).
DES panel: header (name, exchange, sector/industry, 52w range slider with current px), key-stats
grid (dense terminal style), revenue/EPS 4-period bar charts (Recharts), analyst rating stacked bar,
peers strip (top 6 same-industry by market cap) that sets symbolContext on click. Register DES in the
FunctionRouter. Empty/loading states. Playwright: DES NVDA renders stats and peer click switches
context.
```

### PBI-021 · Screener panel
**Deps:** 020. **Description:** criteria-builder screener over instruments+fundamentals+quotes (sector, market cap band, P/E range, div yield, %chg today, volume, RSI level, 52w proximity), AND/OR groups, results grid with save/load screens (`screens` table), export, "add all to watchlist"; `SCR` function.
**Cursor prompt:**
```
Migration 0008: screens (user_id, name, criteria jsonb, RLS owner). Build the Screener panel: a
criteria builder (field registry with types/operators — reuse the rules-engine operator set for
consistency), AND/OR group nesting one level, live result count, Run → server-side filtering via an
edge function /screener that compiles criteria to SQL over instruments ⋈ fundamentals ⋈ quotes_latest
(+ RSI(14) precomputed daily in analytics-service — add that), virtualized results grid with sortable
columns and row → symbolContext; Save/Load/Delete named screens; "Add results to watchlist" picker;
CSV export. Guard: LIMIT 500, criteria Zod-validated, SQL built ONLY via parameterized query builder.
Unit-test criteria→SQL compiler incl. injection attempts. Wire SCR function.
```

### PBI-022 · Alerts & notification center
**Deps:** 007, 011. **Description:** alert rules on price/%change/volume/RSI/news-sentiment per instrument (condition schema shared with rules-engine), `alert-runner` evaluating on ticks/news, notification center (bell, unread badge, toast), alert CRUD UI in watchlist context menu + dedicated panel tab; delivery dedup per DT-ALRT-01.
**Cursor prompt:**
```
Migration 0009: alert_rules (user_id, instrument_id nullable, condition jsonb using rules-engine
row schema, throttle state, active), alerts (fired instances, read flag). Function alert-runner:
subscribed to tick batches and news events, evaluates active alert_rules with @meridian/rules-engine
(context: quote, day stats, RSI, latest news sentiment), applies dedup/throttle policy via
evaluateDomain('alerting') (DT-ALRT-01: min-interval per rule, max/day), inserts alerts, publishes
alerts:{userId}. UI: bell in status bar with unread count + toast on fire; Alerts tab in the
Watchlist panel: create ("price crosses above X", "%chg > Y", "RSI < 30", "negative news") via typed
form, list with enable/disable/delete, fired-history. Playwright: create price-cross alert, drive
feed past it in test mode, toast + unread badge appear once (dedup verified).
```

### PBI-023 · Vector search / RAG foundation
**Deps:** 019. **Description:** pgvector embeddings for news (and future filings) via InsForge AI gateway embedding model; `embed-worker` on new items; `search_news` semantic API (hybrid: vector + symbol/date filters) used by the copilot and a search box in the News panel. Do not embed `docs/` or `docs/kb/` (engineering knowledge base is a separate corpus).
**Cursor prompt:**
```
Migration 0010: news_embeddings (news_id PK, embedding vector(1536)) + ivfflat index. Function
embed-worker: on news insert (realtime trigger or queue poll), call the InsForge AI gateway embeddings
endpoint, store vector; backfill script for seeded news. Function search-news: POST {query, symbols?,
since?, limit} → embed query → hybrid search (vector cosine + metadata filters) → ranked items with
scores. Embed **news (and later filings) only** — never `docs/`, `docs/kb/`, ADRs, or generated API
catalogs (engineering knowledge base is a separate corpus; optional `docs_embeddings` is out of this
PBI). Add semantic search box to the News panel ("earnings beats in semis this week") rendering
ranked results. Handle gateway failures gracefully (retry + dead-letter table). Integration test:
seeded corpus returns the obviously-relevant fixture item first for 5 canned queries.
```

---

## Phase 5 — AI Copilot & Agentic Layer

### PBI-024 · Entitlements, roles & AI action policy
**Deps:** 011. **Description:** roles (trader/admin/compliance) + entitlement decision table DT-ENT-01 enforced in every edge function via a shared `authorize()` helper; DT-AI-01 (AI action approval policy) seeded; admin role management UI.
**Cursor prompt:**
```
Migration 0011: user_roles (user_id, role). Shared helper packages or insforge/functions/_shared/
authorize.ts: given JWT + action domain, evaluateDomain('entitlements') (DT-ENT-01: role × action →
allow/deny/require_approval) — wire into rules-service, order-service, analytics-service, screener,
admin endpoints (deny-by-default). Seed DT-AI-01 per docs/05 §6.7 (copilot action policy). /admin/users:
list users, assign roles (admin only). Tests: matrix test hitting each endpoint as each role
asserting 403/200 per the table; changing DT-ENT-01 draft→publish changes behavior without deploy.
```

### PBI-025 · Copilot chat & read tools
**Deps:** 022, 023, 024. **Description:** Copilot panel: streaming chat via `copilot-orchestrator` (AI gateway, tool loop) with read tools (`get_quote`, `get_bars`, `search_news`, `get_fundamentals`, `screen_instruments`, `get_portfolio`, `explain_rule_decision`); markdown + inline citations (news ids → hoverable); session persistence; context injection (activeSymbol, portfolio summary); `AI` palette function.
**Cursor prompt:**
```
Migration 0012: copilot_sessions, copilot_messages (role, content, tool_calls jsonb). Function
copilot-orchestrator: system prompt (docs/07 §5 template: terminal analyst persona, cite sources,
never invent prices — always call tools, refuse advice-without-data), tool registry with Zod-schema'd
read tools listed above implemented against existing services, agent loop (max 8 tool calls, stream
tokens to client via SSE or realtime), per-user rate limit from DT-AI-01 outputs. Copilot panel:
message list with streamed markdown, tool-call activity indicators ("Searching news…"), citation
chips linking to news drawer / DES, input with slash-suggestions, session list sidebar, "Ask about
<activeSymbol>" quick action; palette AI <q> routes here. Log every tool call to audit_log. Tests:
orchestrator loop unit-tested with a fake LLM (scripted tool-call transcripts); Playwright: ask
"summarize AAPL news today" → response contains citation chips.
```

### PBI-026 · Copilot actions with approval workflow
**Deps:** 025. **Description:** write tools (`create_watchlist_item`, `create_alert`, `propose_order`, `create_monitor`) gated by DT-AI-01 via `copilot_actions` (proposed→approved→executed→failed); approval cards rendered inline in chat (and notification center) with full detail + Approve/Reject; approved orders flow through order-service like manual ones (same rules).
**Cursor prompt:**
```
Migration 0013: copilot_actions (session_id, tool, payload jsonb, policy_outcome, status
proposed|auto_approved|approved|rejected|executed|failed, executed_ref). Orchestrator: register write
tools; on call, evaluateDomain('ai_action_policy') (DT-AI-01) → auto_approve (execute immediately,
e.g. watchlist add) or require_approval (insert proposed action, return "awaiting approval" to the
model so it tells the user). Approval card component in chat: renders payload human-readably (order
cards reuse ticket summary), Approve → executes via the SAME service path as manual actions (order-
service /orders etc., so all trade rules still apply and can still reject), Reject → status +
feedback to session. Also surface pending approvals in the notification center. Tests: DT-AI-01 says
orders always require approval → assert a propose_order never hits order-service without approval;
Playwright: "buy 10 AAPL at market" → approval card → Approve → order appears in blotter.
```

### PBI-027 · Monitors (autonomous standing agents)
**Deps:** 026. **Description:** natural-language monitors ("tell me if any position drops 5% in a day", "watch semis for negative news") compiled by the LLM into rule conditions + a schedule; `monitor-runner` cron evaluates, on trigger generates an LLM explanation and fires an alert (and optionally a proposed action); Monitors management UI.
**Cursor prompt:**
```
Migration 0014: monitors (user_id, name, nl_instruction, compiled_condition jsonb (rules-engine
schema), scope jsonb (symbols|sector|portfolio), cadence, last_run, active). Copilot tool
create_monitor: LLM compiles the instruction into compiled_condition using a constrained JSON schema
(validate with Zod; on invalid, retry once with the validation errors). Function monitor-runner
(cron, e.g. simulated 5-min): evaluate each active monitor against fresh context (quotes, day stats,
portfolio, recent news sentiment via search-news), on trigger: throttle via DT-ALRT-01, write alert
with an LLM-generated 2-sentence explanation citing the data, optionally attach a proposed action
(policy DT-AI-01). Monitors tab in Copilot panel: list, trigger history, pause/delete, "explain what
this watches" (renders compiled condition in plain English). Tests: compiler golden tests (10 canned
instructions → expected condition JSON); runner integration: portfolio-drop monitor fires once when
feed test-mode forces -6%.
```

### PBI-028 · AI research briefs & portfolio insights
**Deps:** 025, 018. **Description:** one-click artifacts: "Morning Brief" (portfolio + watchlist digest: movers, news, alerts, calendar), "Instrument Brief" on DES (thesis-style summary with cited news/fundamentals), "Portfolio Health" (concentration, sector tilt, risk flags from DT-RISK-02 analysis rules) — generated server-side, stored, rendered as rich cards, exportable to PDF (storage bucket).
**Cursor prompt:**
```
Migration 0015: briefs (user_id, kind morning|instrument|portfolio, subject, content_md, data jsonb,
created_at). Function brief-service: three generators composing existing tools (portfolio analytics,
search-news RAG, fundamentals, alerts history) into structured prompts; morning brief also runnable
on a cron at simulated market open (respect user opt-in flag). Portfolio Health runs DT-RISK-02
(analysis-only decision table: concentration >25%, sector >40%, beta-heavy, cash drag) and the LLM
narrates findings WITH the rule audit as source of truth — numbers come from rules output, prose from
LLM. UI: Briefs tab in Copilot panel + "Generate brief" buttons on DES and Portfolio panels; brief
cards render markdown with citation chips; Export PDF → server-side render to storage bucket, signed
URL download. Tests: generators unit-tested with fake LLM; assert Portfolio Health numeric claims
exactly match rules output (no hallucinated figures).
```

---

## Phase 6 — Enterprise Hardening & Release

### PBI-029 · Audit trail completion & compliance views
**Deps:** 024. **Description:** hash-chained `audit_log` (each row stores sha256 of previous), coverage sweep so every mutating endpoint audits, `/admin/audit` browser (filter by user/entity/action/date, export), compliance role read-only access, retention config.
**Cursor prompt:**
```
Alter audit_log: add prev_hash, row_hash (sha256 of canonical row json + prev_hash) computed in a
SQL function on insert; verification function verify_audit_chain(from,to). Sweep every edge function:
ensure each mutation writes audit_log with actor, action, entity, before/after diff (add a shared
audit() helper; grep for inserts/updates lacking it and fix). Build /admin/audit (admin+compliance
roles via DT-ENT-01): virtualized log browser with filters, entity drill-down timeline, chain-verify
button, CSV export. Nightly cron verifies chain integrity and alerts admins on mismatch. Tests:
tamper a row in a test db → verify fails; matrix test that all mutating endpoints produce audit rows.
```

### PBI-030 · Observability, resilience & performance pass
**Deps:** all prior. **Description:** structured logging in all functions (request id, user, latency), client error boundary + reporting endpoint, feed/function health dashboard in admin, realtime reconnect/backoff with stale-data indicators, perf budget enforcement (Architecture §8) with Lighthouse CI + k6-style load script for order preview.
**Cursor prompt:**
```
Add _shared/logger.ts (JSON logs: request_id, user_id, fn, latency_ms, outcome) to every edge
function; client ErrorBoundary per panel (panel crashes don't kill the workspace) reporting to
/telemetry endpoint (stored in a telemetry table, sampled). Status bar: realtime connection state
with auto-reconnect + exponential backoff; panels show "STALE" watermark when last tick > 10s while
market open. /admin/health: function latency percentiles (from telemetry), feed heartbeat, realtime
channel stats. Add Lighthouse CI budget (workspace route: TTI < 3s on CI profile) and a k6 script
hitting order /preview at 50 rps asserting p95 < 300ms against dev. Fix whatever these surface.
```

### PBI-031 · E2E regression suite & release checklist
**Deps:** all prior. **Description:** Playwright suite covering the Test Plan's P0 scenarios end-to-end on seeded mock data in feed test mode; CI gate; `RELEASE.md` checklist (seed, migrate, verify chain, smoke); tag v1.0.
**Cursor prompt:**
```
Create e2e/regression covering docs/04-Test-Plan.md P0 test cases as tagged Playwright specs
(@TC-ids in test titles for traceability): auth+provisioning, watchlist+live quotes, chart, palette
functions, order happy/reject/cancel, bracket lifecycle, blotter, portfolio P&L, alert fire, screener
save/run, copilot Q&A with citations, copilot order approval flow, monitor trigger, rules admin
publish flow, audit chain verify. Run against a freshly seeded environment (scripts/seed-all.ts:
instruments, bars, rules, news, fundamentals, demo users from docs/06) with the feed in
deterministic test mode. Wire into CI as the release gate. Write RELEASE.md runbook (migrate → seed
→ verify_audit_chain → e2e → tag). Update the traceability matrix status column in docs/04 for every
passing TC.
```

---

## Backlog (v2 candidates, not in scope)
BL-01 live broker adapter (Alpaca) · BL-02 real market data (Polygon adapter behind MarketDataProvider) · BL-03 options chain & greeks · BL-04 strategy backtesting · BL-05 multi-market/AU · BL-06 mobile (Expo) · BL-07 social ideas feed · BL-08 SSO/SAML.
