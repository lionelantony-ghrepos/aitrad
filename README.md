# Meridian

AI-native **agentic trading terminal** for US equities and ETFs. Version 1 is **paper trading** only: simulated fills, no real money, built to the same audit and entitlement discipline as a later live-broker release.

> A Bloomberg-grade intelligence workspace with an AI copilot that watches the market for you, explains everything, and trades under rules you define.

This GitHub repo is named `aitrad`; the product name in all specs is **Meridian**.

## Status

**Documentation and seed JSON are in place. Application code is not scaffolded yet.** Next work is PBI-001 (monorepo + CI) through PBI-031, in order, from [docs/03](docs/03-PRD-PBIs-and-Cursor-Prompts.md).

| Artifact | Location |
|---|---|
| Product, architecture, PRD, tests, rules | [`docs/`](docs/00-README.md) |
| Agent / Cursor profile | [`AGENTS.md`](AGENTS.md), [`.cursor/rules/aitrad.mdc`](.cursor/rules/aitrad.mdc) |
| Seed JSON | [`mock_data/`](mock_data/) (150 instruments, fundamentals, news templates, demo users) |

## What v1 includes

- **Workspace** — multi-panel terminal (chart, watchlist, order ticket, blotter, news, screener, portfolio, copilot), linked symbol context, `Ctrl+K` command palette (`DES AAPL`, `NEWS TSLA`, `PORT`, `AI …`).
- **Paper trading** — $100,000 starting cash; market / limit / stop / bracket / OCO / trailing; pre-trade checks explained from decision tables.
- **Intelligence** — mock market feed, news, DES fundamentals, screeners, alerts, RAG over news.
- **Copilot** — research with citations; monitors; proposed actions. **Orders never execute without an explicit user approval.**
- **Admin** — decision-table editor, roles, tamper-evident audit.

Out of v1 (roadmap in doc 01): live brokers (Alpaca/IBKR), real market data, options, mobile, multi-market.

## Stack

| Layer | Choice |
|---|---|
| Web | Next.js 15 (App Router), TypeScript strict, Tailwind, shadcn/ui, dockview |
| Charts / tables | Lightweight Charts, Recharts, TanStack Table |
| Client state | Zustand, TanStack Query |
| Backend | [InsForge](https://insforge.dev/) — Postgres + RLS, Auth, edge functions, realtime, storage, AI gateway, pgvector |
| Policy | Decision tables in Postgres, evaluated by `@meridian/rules-engine` |
| Contracts | Zod in `@meridian/schemas` |
| Tests | Vitest, Playwright, MSW |
| Repo | pnpm workspaces + Turborepo |

Target tree (after scaffolding):

```
apps/web/                    # terminal UI
packages/schemas/            # shared Zod DTOs
packages/rules-engine/       # pure decision-table evaluator
packages/paper-engine/       # pure matching engine
packages/mock-data/          # generators + seed scripts
insforge/functions/          # Deno edge functions
insforge/migrations/         # append-only SQL
docs/                        # this documentation set
mock_data/                   # static seed JSON (checked in)
```

InsForge is isolated behind a repository layer so migrations stay portable SQL if the backend is swapped later.

## Documentation

| Doc | Purpose |
|---|---|
| [00 Index](docs/00-README.md) | Map of the doc set |
| [01 Market & business](docs/01-Market-Survey-and-Business-Blueprint.md) | Competitors, personas, pillars, v1–v3, InsForge rationale |
| [02 Architecture](docs/02-Technical-Architecture-Blueprint.md) | Stack, system diagram, data model, order FSM, AI, security |
| [03 PRD / PBIs](docs/03-PRD-PBIs-and-Cursor-Prompts.md) | 31 PBIs in build order with Cursor prompts |
| [04 Test plan](docs/04-Test-Plan.md) | AC/TC per PBI; agents tick Status as tests pass |
| [05 Business rules](docs/05-Business-Rules-and-Decision-Tables.md) | 12 baseline decision tables (normative) |
| [06 Mock data](docs/06-Mock-Data-and-Seeding.md) | Generators, seed pipeline, expected counts |
| [07 Agent build guide](docs/07-Agent-Build-Guide.md) | Cursor setup, session protocol, Definition of Done |
| [08 User guide](docs/08-User-Guide.md) | End-user manual (draft until UI ships) |

**Agents:** start at [doc 07](docs/07-Agent-Build-Guide.md) §1, then execute PBI-001 → PBI-031. Traceability is `PBI-nnn` → `AC-nnn-xx` → `TC-nnn-xx` ([doc 04](docs/04-Test-Plan.md) is the test source of truth).

## Build order (summary)

| Phase | PBIs | Focus |
|---|---|---|
| 0 Scaffolding | 001–004 | Monorepo, InsForge + RLS, terminal shell, auth + $100k paper account |
| 1 Market data | 005–009 | 150-symbol universe, mock tick feed, watchlist, chart, command palette |
| 2 Rules | 010–012 | Rules engine, `rules-service`, admin console |
| 3 Trading | 013–018 | Ticket, order service, paper matcher, advanced orders, blotter, portfolio |
| 4 Intelligence | 019–023 | News, DES, screener, alerts, RAG |
| 5 Copilot | 024–028 | Entitlements, chat tools, approvals, monitors, briefs |
| 6 Hardening | 029–031 | Audit/compliance, observability, E2E release gate |

Policy is **not** encoded as magic numbers in UI or services. If a limit, fee, or entitlement changes, it belongs in a decision table (doc 05) and is evaluated through `rules-service`.

## Prerequisites (when implementation starts)

1. Node.js + **pnpm**; Cursor with Agent mode.
2. InsForge project (e.g. `meridian-dev`) and the **InsForge MCP** connected in Cursor.
3. One PBI per chat session; prepend the [PRD preamble](docs/03-PRD-PBIs-and-Cursor-Prompts.md); commit `feat(PBI-00X): …`.

Until PBI-001 lands there is no `pnpm install` / `pnpm dev` at the repo root.

## Demo users (after seed)

Defined in `mock_data/demo-users.json` and doc 06. After `scripts/seed-all.ts` exists and has been run: trader / admin / compliance accounts use password `Meridian!Demo1`. **Paper accounts only.**

## Compliance posture

v1 is simulated trading. The product still requires immutable `audit_log`, entitlement matrix (DT-ENT-01), suitability tables, and human-in-the-loop AI orders so a licensed live-trading v2 does not require a rewrite of governance.

Meridian Copilot is information and analysis, not personalized financial advice.
