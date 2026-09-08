# Meridian — Agent Build Guide (Cursor Operating Manual)

**Version:** 1.0 | **Date:** 2026-07-03
Purpose: everything a coding agent needs to build Meridian with zero manual coding.

## 1. One-time setup (human, ~15 min)
1. Clone this repo and open it in Cursor on **Linux or WSL2**. Install Node.js 20+ and pnpm. Native Windows (outside WSL) is not a supported path for the local Docker backend.
2. This tree already has `docs/`, `mock_data/`, `apps/`, `packages/`, and `insforge/`. Do not invent a second seed universe.
3. **InsForge backend** — pick one. This workspace uses **A**.

   **A. Local Docker (default here)**  
   Requires Docker Engine with Compose **2.24.4+** (~1.5 GB for the daemon). From the repo root:

   ```bash
   npx -y @insforge/cli local start
   ```

   First start needs network (fetches `deploy/setup.sh`, pulls images). It writes `.insforge/checkout/` and seeds **`.env.local`** with the app URL and **anon** key only (default app port `7130`; if that block is taken the CLI shifts by ten and prints the new ports). After start, project-scoped CLI (`db`, `functions`, …) targets this directory’s stack with no cloud login.

   ```bash
   npx -y @insforge/cli local status          # health; keys masked
   npx -y @insforge/cli db migrations up --all
   npx -y @insforge/cli local stop            # keeps volumes
   ```

   Do not commit `.insforge/` or `.env.local`. Server-side seed needs `INSFORGE_URL` + `INSFORGE_API_KEY` in a gitignored `.env` (not `NEXT_PUBLIC_*`). Read the API key from `local start --json` / `local status --show-keys` into that file; do not paste keys into the repo or chat logs.

   **B. Hosted InsForge Cloud**  
   Sign up at insforge.dev, create project `meridian-dev`; in Cursor, add the **InsForge MCP server** (Settings → MCP; paste project key). Set `apps/web/.env.local` from `apps/web/.env.example` to the `*.insforge.app` URL. Verify Cursor can list InsForge tools.

4. Cursor rules already live at `.cursor/rules/aitrad.mdc` (`alwaysApply: true`). If you bootstrap a greenfield clone, copy §2 below.
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
- Local Docker will not start → Docker daemon running? Compose ≥ 2.24.4? First start needs network. If `.insforge/checkout/.env` is missing but volumes still exist, restore that file or `local stop --delete-data` (destroys the local DB).
- App cannot reach InsForge → `NEXT_PUBLIC_INSFORGE_URL` must match the printed app port (`http://localhost:7130` unless the CLI shifted ports). Restart `pnpm dev` after `.env.local` changes.
- InsForge MCP tool errors (hosted) → check project key + docs.insforge.dev; re-add server in Cursor. Do not start `local` to work around a failed cloud login — that is a different backend.
- Realtime flakiness in tests → use feed test mode (`feed.paused` + `force_price`) instead of sleeps.
- LLM nondeterminism in tests → fake-LLM harness (scripted transcripts) is mandatory for CI; live-LLM tests are smoke-only, non-blocking.
- Migration drift → migrations are append-only numbered files; never edit an applied migration; add a new one.
