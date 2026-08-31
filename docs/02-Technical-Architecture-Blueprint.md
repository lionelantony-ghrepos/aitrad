# Meridian — Technical Architecture Blueprint

**Version:** 1.0 | **Date:** 2026-07-03

---

## 1. Stack decision (enterprise-grade, agent-buildable)

| Layer | Choice | Rationale / alternative considered |
|---|---|---|
| Frontend | **Next.js 15 (App Router) + TypeScript (strict)** | Industry standard, best Cursor support. Alt: Remix — fine, less ecosystem. |
| UI | **Tailwind CSS + shadcn/ui + Radix** | Accessible primitives, terminal-dark theme. Alt: MUI — heavier, less customizable for terminal aesthetics. |
| Charts | **TradingView Lightweight Charts** (price) + **Recharts** (analytics) | Lightweight Charts is the open-source standard for candlesticks. |
| State | **Zustand** (client) + **TanStack Query** (server cache) | Simple, testable; avoids Redux boilerplate. |
| Grid | **TanStack Table** (virtualized) | Blotters/monitors need 1k+ row virtualization. |
| Backend | **InsForge** — Postgres (auto REST), Auth (JWT/OAuth), Edge Functions (Deno), Realtime pub/sub, Storage, AI Gateway, pgvector | User-fixed. Agent-native (MCP), covers all 7 backend needs in one platform. |
| Rules engine | **Decision tables in Postgres + portable TS evaluator** (`packages/rules-engine`) | Declarative, versioned, hot-reloadable, auditable. Alt: json-rules-engine (used as evaluation core), Drools (JVM, overkill for v1). |
| AI | **InsForge AI Gateway** (Claude/GPT) + tool-calling loop in edge function + pgvector RAG | Keys never touch the browser. |
| Validation | **Zod** end-to-end (shared schemas package) | Single source of truth for DTOs. |
| Testing | **Vitest** (unit) + **Playwright** (E2E) + **MSW** (API mocks) | Maps to Test Plan TCs. |
| Monorepo | **pnpm workspaces + Turborepo** | `apps/web`, `packages/{schemas,rules-engine,paper-engine,mock-data}` |
| Quality | ESLint (strict), Prettier, Husky + lint-staged, GitHub Actions CI, Changesets | Enterprise hygiene. |

## 2. System architecture

```
┌────────────────────────── Browser ──────────────────────────┐
│ Next.js App: Terminal Shell (panels, command palette)        │
│  Panels: Chart · Watchlist · OrderTicket · Blotter · News ·  │
│  Screener · Portfolio · Copilot Chat · Rules Admin           │
│  Zustand stores ◄── TanStack Query ◄── API client (typed)    │
│  Realtime client (quotes, order events, alerts)              │
└──────────────┬───────────────────────────────┬──────────────┘
               │ HTTPS (auto REST + RPC)       │ WebSocket (realtime)
┌──────────────▼───────────── InsForge ────────▼──────────────┐
│ Auth (JWT/OAuth)          Realtime pub/sub channels          │
│ Postgres (+pgvector, RLS) ── auto-generated REST API         │
│ Edge Functions (Deno):                                       │
│   market-tick (mock feed generator, cron)                    │
│   order-service (validate→rules→match→fill→events)           │
│   paper-matching-engine (packages/paper-engine)              │
│   rules-service (decision-table evaluation + cache)          │
│   copilot-orchestrator (LLM tool loop, approvals)            │
│   monitor-runner (scheduled agent monitors → alerts)         │
│   analytics-service (P&L, exposure, performance)             │
│ AI Gateway (LLM calls)    Storage (statements, exports)      │
└──────────────────────────────────────────────────────────────┘
```

**Panel linking:** panels subscribe to a shared `symbolContext`; clicking AAPL in the watchlist retargets chart, news, order ticket (Bloomberg "launchpad group" pattern).

## 3. Data model (core tables)

`users`, `profiles` (persona, suitability tier), `accounts` (paper cash, currency), `instruments` (symbol, name, exchange, sector, status, tick_size, lot_size), `market_bars` (OHLCV 1m/1d), `quotes_latest`, `watchlists`, `watchlist_items`, `orders` (type, side, qty, limit/stop px, TIF, status FSM, parent_id for brackets), `executions`, `positions` (qty, avg_cost, realized_pnl), `portfolio_snapshots`, `news_items` (+ `news_embeddings` pgvector), `fundamentals`, `screens` (saved screener defs), `alerts` + `alert_rules`, `copilot_sessions`, `copilot_messages`, `copilot_actions` (proposed→approved→executed), `monitors`, **rules tables:** `rule_sets`, `decision_tables`, `decision_rows`, `rule_bindings`, `rule_audit`; `audit_log` (immutable, append-only), `entitlements`, `feature_flags`.

**Conventions:** UUID PKs, `created_at/updated_at`, soft deletes where user-facing, RLS on all user-owned tables (`user_id = auth.uid()`), append-only trigger on `audit_log` and `executions`.

## 4. Order lifecycle (FSM)

`draft → validated → accepted → working → partially_filled → filled | cancelled | rejected | expired`

Every transition: (1) evaluated by rules-service (order-validation + risk decision tables), (2) written to `audit_log`, (3) published on realtime channel `orders:{userId}`. The paper matching engine fills against the mock feed: market orders at next tick ± configurable slippage (decision table `DT-EXEC-01`), limit orders when price crosses, stops trigger→market. Deterministic given a feed seed ⇒ testable.

## 5. Business-rules architecture (see doc 05 for tables)

- Decision tables stored as rows (`hit_policy`: first/all/collect; versioned; effective-dated; draft→published workflow).
- `rules-service` edge function loads published tables into an in-memory evaluator (json-rules-engine style condition trees compiled from rows), cache invalidated via realtime on publish.
- Every evaluation writes `rule_audit` (inputs, matched rows, outcome) — regulators-grade explainability, and the copilot cites it when explaining a rejection.
- Domains governed: order validation, pre-trade risk, suitability/entitlements, fees/slippage simulation, alerting thresholds, AI action approval policy, market-hours calendar.

## 6. AI/agentic architecture

- **Copilot orchestrator** (edge function): system prompt + tool registry → InsForge AI Gateway → tool-call loop. Tools: `get_quote`, `get_bars`, `search_news` (RAG/pgvector), `get_fundamentals`, `screen_instruments`, `get_portfolio`, `analyze_portfolio`, `explain_rule_decision`, `create_watchlist_item`, `create_alert`, `propose_order`, `create_monitor`.
- **Action safety:** read tools execute freely; write tools create `copilot_actions` rows. Orders are ALWAYS `proposed` → user approves in UI → order-service executes. Approval policy itself is a decision table (`DT-AI-01`) — e.g., auto-approve watchlist adds, require approval for orders, block orders > X% of equity.
- **Monitors:** user- or copilot-created standing instructions (natural language + compiled rule condition), run by `monitor-runner` on cron, emit alerts with an LLM-written explanation.
- **RAG:** news + filing chunks embedded into pgvector; copilot research briefs cite retrieved items.

## 7. Security & enterprise controls

RLS everywhere; JWT with short expiry + refresh; role model (`trader`, `admin`, `compliance`) enforced via entitlement decision table; all LLM calls server-side; immutable audit (append-only + hash chain column); rate limits per user on order & AI endpoints; input validation with Zod at every edge function boundary; CSP + no third-party scripts; secrets only in InsForge env; CI gates (typecheck, lint, unit, E2E smoke).

## 8. Performance targets
p95 REST < 300 ms; quote fan-out < 500 ms tick-to-screen; chart initial render < 1 s for 5y daily; blotter 5k rows virtualized at 60 fps; copilot first token < 2 s.

## 9. Risks & mitigations
| Risk | Mitigation |
|---|---|
| InsForge platform maturity | Repository layer isolates SDK; plain-SQL migrations; portable Deno/TS functions (Supabase-compatible shape) |
| Realtime throughput for ticks | Batch ticks (250 ms coalescing); fallback thin WS relay |
| LLM cost/latency | Model tiering via AI gateway (small model for classification, large for briefs); response caching |
| Mock→real data drift | Provider-adapter interface (`MarketDataProvider`) from day 1; Polygon adapter is v2 drop-in |
| Rules complexity creep | Hit-policy discipline + rule_audit + simulation mode ("test table against last 30 days of orders") |

## 10. Repository layout
```
meridian/
├─ apps/web/                 # Next.js app (panels, palette, admin)
├─ packages/schemas/         # Zod DTOs shared FE/BE
├─ packages/rules-engine/    # decision-table evaluator (pure TS)
├─ packages/paper-engine/    # matching engine (pure TS)
├─ packages/mock-data/       # generators + seed JSON
├─ insforge/functions/       # edge functions
├─ insforge/migrations/      # SQL migrations
├─ docs/                     # this doc set
└─ .cursor/rules/            # agent build rules (doc 07)
```
