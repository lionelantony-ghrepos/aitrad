# Meridian — Agent Build Guide (Cursor Operating Manual)

**Version:** 1.0 | **Date:** 2026-07-03
Purpose: everything a coding agent needs to build Meridian with zero manual coding.

## 1. One-time setup (human, ~15 min)
1. Create a GitHub repo `meridian`; clone; open in Cursor.
2. Copy this repo's `docs/` and `mock-data/` folders into it.
3. Sign up at insforge.dev, create project `meridian-dev`; in Cursor, add the **InsForge MCP server** (Settings → MCP → follow InsForge docs; paste project key). Verify Cursor can list InsForge tools.
4. Create `.cursor/rules/meridian.mdc` with §2 below (set `alwaysApply: true`).
5. Work PBI by PBI from `docs/03`: paste the preamble + the PBI prompt into Cursor (Agent mode). Review diffs, let tests run, commit per PBI (`feat(PBI-00X): …`). One PBI per chat session keeps context clean.

## 2. `.cursor/rules/meridian.mdc` (copy verbatim)
```md
---
description: Meridian build rules
alwaysApply: true
---
- Read docs/02 (architecture), docs/05 (rules), docs/06 (mock data), and docs/kb/INDEX.md
  (plus as-built files for dependency PBIs) before implementing any PBI.
- TypeScript strict everywhere; no `any` without a justifying comment.
- All API/DTO boundaries validated with Zod schemas from @meridian/schemas — define there first.
- NO business thresholds, fees, limits, or policy branches in application code. Policy = decision
  tables (docs/05). If you need a new threshold, add a decision table row/column and evaluate it
  via rules-service. Adding a hard-coded business constant is a build failure.
- All InsForge access goes through the repository layer (apps/web/lib/api) or shared function
  helpers — never inline SDK/REST calls in components.
- Pure logic (matching, indicators, P&L, rules evaluation, generators) lives in packages/* with
  no I/O and full unit tests. Edge functions orchestrate; they do not compute business math inline.
- Every mutating endpoint: authorize() (DT-ENT-01) + audit_log write. No exceptions.
- Every PBI: write the tests named in docs/04 for its TC ids, tag Playwright specs @TC-nnn-xx,
  tick the Status boxes in docs/04-Test-Plan.md, fill docs/kb/as-built/PBI-00X.md from
  docs/kb/_template-as-built.md, update docs/kb/INDEX.md, and add an ADR only if the design
  is not already in docs/02. Same commit. Do not auto-rewrite docs 01–06. Patch docs/08 only
  for newly shipped user-visible UI. Engineering kb must not be indexed into PBI-023 news RAG.
- Use the InsForge MCP for migrations/functions/buckets; never fabricate SDK APIs — check
  docs.insforge.dev when unsure.
- UI: terminal design tokens only (no ad-hoc colors); every panel handles loading/empty/error;
  numbers use tabular-nums; green=up/red=down semantics.
- Secrets only in InsForge env config. Never in code, never in the client bundle.
- Commit format: feat(PBI-00X): <summary>. Do not start the next PBI in the same session.
```

## 3. Build order & session protocol
Follow `docs/03` PBI-001 → PBI-031 strictly. Per session: (1) paste preamble+prompt, (2) read `docs/kb/INDEX.md` and as-built of dependency PBIs, (3) agent implements + tests, (4) run `pnpm test` and targeted Playwright, (5) agent updates docs/04 status boxes and `docs/kb/as-built/PBI-00X.md` (+ INDEX; ADR only if needed; doc 08 delta only if user-visible UI shipped), (6) `pnpm docs:generate` if schemas/packages changed, (7) commit. If a PBI fails its TCs, fix within the session before moving on — never carry red tests forward.

## 4. Definition of Done (per PBI)
Code merged · P0/P1 TCs for the PBI pass in CI · docs/04 boxes ticked · `docs/kb/as-built/PBI-00X.md` filled (required headings, no TBD) · INDEX updated · no lint/type errors · audit + entitlement coverage for any new mutating endpoint · no hard-coded policy (spot-check: grep for magic numbers).

## 5. Copilot system-prompt template (used by PBI-025)
```
You are Meridian Copilot, a market analyst inside a trading terminal. Rules:
- Never state a price, P&L, or metric you did not just retrieve via a tool. No memory prices.
- Cite sources: attach news ids / data refs for every factual claim.
- You may propose actions via tools; orders always require user approval — say so.
- You are not a licensed financial advisor: frame outputs as information/analysis, not advice;
  note material risks when discussing positions.
- Be terse and terminal-like: dense, factual, no filler.
- If a rule (e.g. risk limit) blocked something, explain it using explain_rule_decision, never
  speculate about why.
```

## 6. Troubleshooting
- InsForge MCP tool errors → check project key + docs.insforge.dev; re-add server in Cursor.
- Realtime flakiness in tests → use feed test mode (`feed.paused` + `force_price`) instead of sleeps.
- LLM nondeterminism in tests → fake-LLM harness (scripted transcripts) is mandatory for CI; live-LLM tests are smoke-only, non-blocking.
- Migration drift → migrations are append-only numbered files; never edit an applied migration; add a new one.
