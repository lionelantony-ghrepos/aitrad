# Meridian knowledge base

Living **as-built** handbook for humans (onboarding, ops, compliance) and coding agents (later PBI sessions). Specs in `docs/01`–`docs/06` remain the normative product and policy. This folder records what actually shipped.

## How to use

1. **Agents:** before implementing PBI-N, read this index and the as-built files for **dependency PBIs**. After shipping, add `as-built/PBI-NNN.md` from [`_template-as-built.md`](_template-as-built.md) in the same commit as code and [doc 04](../04-Test-Plan.md) ticks.
2. **Humans:** start here, then as-built → ADRs → [generated reference](generated/). User-visible behavior belongs in [doc 08](../08-User-Guide.md) (delta only when a panel or command ships).
3. **Do not** auto-rewrite docs 01–06. Disagreements go in **Shipped vs spec** on the as-built page.

## Corpora (do not mix)

| Corpus | Location | Consumer |
| --- | --- | --- |
| Product spec | `docs/01`–`06` | Agents + humans |
| Engineering knowledge base | `docs/kb/` (this tree) | Agents + humans |
| User narrative | `docs/08` | End users |
| Market news RAG | Postgres `news_embeddings` (PBI-023 `search_news`) | **Trading copilot only** |

PBI-023 embeds **news** (and later filings) for the copilot. It must **not** ingest `docs/`, `docs/kb/`, ADRs, or generated API catalogs. A separate `docs_embeddings` index for internal search is optional and out of v1 unless explicitly scheduled.

## As-built

| PBI | As-built | Notes |
| --- | --- | --- |
| 001 | [PBI-001](as-built/PBI-001.md) | Monorepo & CI (backfilled from tree) |
| 002 | [PBI-002](as-built/PBI-002.md) | InsForge baseline (backfilled from tree) |
| 003 | [PBI-003](as-built/PBI-003.md) | Terminal shell, dockview, theme tokens |
| 004 | [PBI-004](as-built/PBI-004.md) | Auth, profile wizard, paper-account provision |
| 005 | [PBI-005](as-built/PBI-005.md) | Instrument master, GBM bars, quotes_latest seed |
| 006 | [PBI-006](as-built/PBI-006.md) | Mock market-tick, NYSE calendar, quotes channel |
| 007 | [PBI-007](as-built/PBI-007.md) | Watchlist panel, useQuotes coalesce, symbolContext |
| 008 | [PBI-008](as-built/PBI-008.md) | Chart panel, lightweight-charts, @meridian/indicators |
| 009–031 | _pending_ | Copy [`_template-as-built.md`](_template-as-built.md) when the PBI ships |

## Architecture decision records

| ADR | Title |
| --- | --- |
| [0001](adr/0001-docs-as-code-knowledge-layer.md) | Docs-as-code knowledge layer beside the spec |

Add further ADRs from [`_template-adr.md`](_template-adr.md) only for durable choices not already in doc 02.

## Generated reference

Produced by `pnpm docs:generate` (committed snapshots). CI fails if generation is stale.

- [generated/README.md](generated/README.md)
- [generated/packages.md](generated/packages.md)
- [generated/schemas-catalog.md](generated/schemas-catalog.md)

## Completeness gate

- `pnpm docs:kb-check` — required headings; reject empty `TBD` sections; require an as-built file for each `feat(PBI-NNN)` commit in the PR/push range.
- See [doc 04 DOC process checks](../04-Test-Plan.md) (`AC-DOC-*`).
