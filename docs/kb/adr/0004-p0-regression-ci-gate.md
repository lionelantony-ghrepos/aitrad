# ADR-0004 — P0 Playwright regression as the CI release gate

Date: 2026-09-14
Status: accepted

Use this **only** when a durable design choice is not already stated in [doc 02](../../02-Technical-Architecture-Blueprint.md), or when implementation must refine/deviate from that blueprint. Do not duplicate the architecture doc.

## Context

Doc 02 §7 lists CI gates as typecheck, lint, unit, and **E2E smoke**. PBI-031 requires a tagged P0 suite on seeded mock data in feed test mode, plus a migrate → seed → `verify_audit_chain` → e2e → tag runbook. GitHub Actions does not run a local InsForge Docker project, so the Actions job cannot execute `scripts/seed-all.ts` against Postgres.

## Decision

- **CI release gate:** Playwright project `regression` (`apps/web/e2e/regression`) with `E2E_AUTH_STUB=1`. Quotes and fills are driven by deterministic stub tick events (`feed.paused` / `force_price` equivalents). `pnpm test:traceability` greps `@TC-*` tags against doc 04 P0 rows.
- **Cutover / v1.0 tag:** [RELEASE.md](../../../RELEASE.md) against a real InsForge: migrate → `pnpm seed:all` (feed paused) → `pnpm verify:audit-chain` → regression e2e → `v1.0.0`.
- Remaining per-PBI Playwright files stay on project `chromium` for extra coverage; they are not the named release gate.

## Consequences

CI can stay hermetic. Live seed counts and SQL `verify_audit_chain` are operator steps, not Actions services. Related: [PBI-031 as-built](../as-built/PBI-031.md).

## Alternatives considered

- Run InsForge in Actions via Docker: closer to prod, slower and flake-prone for v1.
- Only grep existing e2e files without a `regression/` folder: fails the PBI prompt’s layout requirement.
