# ADR-0001 — Docs-as-code knowledge layer beside the spec

Date: 2026-09-02
Status: accepted

## Context

Meridian is built PBI-by-PBI by coding agents. Specs in `docs/01`–`08` define intent; they do not record what each session actually shipped, which files to extend, or where implementation refined the blueprint. Unconstrained LLM wikis drift. An external Confluence/Notion wiki would be a second system of record and is a poor retrieval source for Cursor agents.

## Decision

Keep a versioned knowledge layer under `docs/kb/`:

- Structured **as-built** one file per PBI (mandatory in Definition of Done).
- **ADRs** only when a durable choice is missing from or refines [doc 02](../../02-Technical-Architecture-Blueprint.md).
- **Generated** package/schema catalogs from CI (`pnpm docs:generate`).
- Completeness checked by `pnpm docs:kb-check`, not by an LLM authoring step.

Normative policy remains decision tables (doc 05) and specs 01–06. As-built files cite table IDs and must not copy thresholds.

## Consequences

Later PBI sessions can read dependency as-built pages instead of reconstructing history from git. Humans get a handbook TOC at [INDEX.md](../INDEX.md). CI will fail a `feat(PBI-NNN)` commit that omits `docs/kb/as-built/PBI-NNN.md` or leaves required sections as `TBD`.

## Alternatives considered

- **Generated-only (Typedoc/OpenAPI):** cheap, but does not explain PBI intent, deferred work, or how to extend.
- **External wiki sync:** extra source of truth, drift, weak for agents.
- **Index engineering docs into PBI-023 `search_news`:** would mix trading research with internal design; rejected. News RAG stays a separate corpus.
