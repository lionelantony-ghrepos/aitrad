# Meridian — Agent project profile

**Product:** Meridian — an AI-native, agentic trading terminal (web).  
**Scope (v1):** US equities and ETFs, **paper trading only**. No live money, no broker-dealer license required.  
**How it is built:** entirely by coding agents in Cursor against the docs in `docs/`. Do not invent product or policy outside those documents.

## What you are building

A Bloomberg-style multi-panel workspace with:

1. **Terminal workspace** — dockable panels, linked `symbolContext`, command palette (`DES`, `NEWS`, `PORT`, `ORD`, `AI`, …).
2. **Trading core** — order ticket + paper matching engine (market/limit/stop/bracket/OCO/trailing). Broker adapters are v2.
3. **Intelligence** — news, fundamentals (DES), screeners, alerts, pgvector RAG.
4. **Copilot** — tool-calling research and monitors; **orders always require explicit user approval**.
5. **Programmable governance** — decision tables drive validation, risk, fees, entitlements, AI policy. **No hard-coded business thresholds in application code.**

Value proposition (doc 01): a retail-usable intelligence workspace whose copilot can research, explain, and act under rules the user (and admins) define.

Personas: active retail trader, research-driven investor, power/quant hobbyist, internal admin/compliance.

## Current repo state

This clone currently holds **spec + seed JSON only**. Application code (`apps/`, `packages/`, `insforge/`) is not scaffolded until PBI-001 / PBI-002.

| Path | Role |
|---|---|
| `docs/` | Canonical product, architecture, PRD, tests, rules, seed, agent, user docs |
| `mock_data/` | Seed JSON (instruments, fundamentals, news templates, demo users). Specs also call this `mock-data/` — keep generators in `@meridian/mock-data`; do not fork a second universe |
| `.cursor/rules/aitrad.mdc` | Always-on build rules |

## Stack (normative — doc 02)

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 App Router, TypeScript **strict**, Tailwind, shadcn/ui + Radix, dockview (or equivalent) panel grid |
| Charts | TradingView Lightweight Charts + Recharts |
| State | Zustand + TanStack Query; TanStack Table for blotters |
| Backend | **InsForge** — Postgres + RLS, Auth JWT/OAuth, edge functions (Deno), realtime, storage, AI gateway, pgvector |
| Rules | `@meridian/rules-engine` + `rules-service`; tables in Postgres (doc 05) |
| Validation | Zod in `@meridian/schemas` — define DTOs there first |
| Tests | Vitest (packages), Playwright (E2E, tag `@TC-nnn-xx`), MSW |
| Monorepo | pnpm workspaces + Turborepo |

Target layout after PBI-001:

```
apps/web/
packages/{schemas,rules-engine,paper-engine,mock-data}/
insforge/{functions,migrations}/
docs/
.cursor/rules/
```

InsForge access only through `apps/web/lib/api` (repository layer) or shared function helpers — never inline SDK/REST in React components. Pure math lives in `packages/*` with no I/O.

## How to work (doc 07)

1. Human: InsForge project + InsForge MCP in Cursor; copy rules from `.cursor/rules/aitrad.mdc`.
2. Build **strictly** `docs/03` PBI-001 → PBI-031. One PBI per chat session.
3. Prepend the PRD prompt preamble to every PBI prompt.
4. Tests named in `docs/04` are the source of truth. Tick Status boxes in the **same commit** as the passing tests.
5. Commit: `feat(PBI-00X): <summary>`. Do not start the next PBI in the same session.
6. If TCs fail, fix before moving on. Do not carry red tests forward.

Traceability: `PBI-nnn` → `AC-nnn-xx` → `TC-nnn-xx`.

## Non-negotiable product rules

- Policy = decision tables (doc 05). New threshold → table row/column + `rules-service`. Hard-coded business constants are a **build failure**.
- Every mutating endpoint: `authorize()` (DT-ENT-01) + `audit_log` write.
- Copilot: never invent prices/P&L; cite tools/news ids; orders are `proposed` until the user approves (DT-AI-01).
- UI: terminal tokens only (near-black `#0a0e14`, amber `#ffb000`, cyan accents); loading/empty/error on every panel; `tabular-nums`; green=up / red=down.
- Secrets only in InsForge env. Never in git or the client bundle.
- Migrations are append-only numbered SQL. Never edit an applied migration.
- Use InsForge MCP for migrations/functions/buckets. Do not fabricate SDK APIs — check https://docs.insforge.dev.

## Doc map

| Doc | When to read |
|---|---|
| [docs/00-README.md](docs/00-README.md) | Index |
| [docs/01-…](docs/01-Market-Survey-and-Business-Blueprint.md) | Why / personas / v1–v3 scope |
| [docs/02-…](docs/02-Technical-Architecture-Blueprint.md) | Stack, data model, order FSM, AI, security — **before any PBI** |
| [docs/03-…](docs/03-PRD-PBIs-and-Cursor-Prompts.md) | Build order + paste-ready prompts |
| [docs/04-…](docs/04-Test-Plan.md) | AC/TC; tick boxes as tests pass |
| [docs/05-…](docs/05-Business-Rules-and-Decision-Tables.md) | Normative decision tables — **before any PBI** |
| [docs/06-…](docs/06-Mock-Data-and-Seeding.md) | Generators, seed pipeline, expected counts |
| [docs/07-…](docs/07-Agent-Build-Guide.md) | Session protocol, DoD, copilot system prompt |
| [docs/08-…](docs/08-User-Guide.md) | End-user behavior (finalize after UI ships) |

## Definition of Done (per PBI)

Code in · P0/P1 TCs for that PBI pass · `docs/04` boxes ticked · no lint/type errors · audit + entitlement on new mutating endpoints · no hard-coded policy (spot-check magic numbers).
