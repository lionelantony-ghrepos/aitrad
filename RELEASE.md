# Meridian v1.0 release runbook

Paper-trading US equities only. Follow this order on a **fresh** InsForge project (local Docker or hosted). Do not skip verify.

## Prerequisites

- Node ≥ 20.11, pnpm 9.15.9
- InsForge running (`npx -y @insforge/cli local start` or a linked cloud project)
- Env names (values stay in InsForge / `.env`, never commit): `INSFORGE_URL`, `INSFORGE_API_KEY`, `NEXT_PUBLIC_INSFORGE_URL`, `NEXT_PUBLIC_INSFORGE_ANON_KEY`, `API_KEY`, `INSFORGE_INTERNAL_URL` / `INSFORGE_BASE_URL`
- Optional LLM/embed names when exercising copilot RAG live: `OPENROUTER_API_KEY`, `MERIDIAN_COPILOT_LLM`, `MERIDIAN_EMBEDDING_MODE`

## 1. migrate

Apply numbered SQL in order (append-only; never edit an applied file):

```bash
npx -y @insforge/cli db migrations up --all
```

Deploy bundled edge functions from `insforge/functions` (rebundle with `pnpm functions:bundle:<slug>` when sources changed).

## 2. seed

Idempotent universe + rules + demo users (docs/06). Leaves the mock feed in **test mode** (`feature_flags` `feed.paused` = true; drive prices with `feed.force_price` / pause-step).

```bash
pnpm seed:all
```

Expect: 150 instruments, published decision tables, 500 news items + embeddings, four demo users (`demo.trader@meridian.test`, `demo.novice@meridian.test`, `demo.admin@meridian.test`, `demo.compliance@meridian.test`), trader book of six positions and three watchlists. Non-zero exit on count mismatch.

After the GBM count gate, `seed:all` applies the **committed** Yahoo-shaped snapshot in `mock_data/market-snapshot/` (quotes, latest daily bars, 52-week ranges, priority 1m bars, original two-sentence news summaries). That overlay is offline — Path A / CI / `seed:all` must **never** hit Yahoo.

Refresh fixtures once (live Yahoo, not a gate), commit, then re-seed offline:

```bash
pnpm market:freeze
git add mock_data/market-snapshot
# commit the JSON + SOURCE.md, then:
pnpm seed:all
```

See `mock_data/market-snapshot/SOURCE.md`. Optional live DB apply without rewriting fixtures: `pnpm market:overlay:live` (local only).

## 3. verify_audit_chain

```bash
pnpm verify:audit-chain
```

This runs SQL `verify_audit_chain(NULL, NULL)` (project_admin). Tamper detection must stay green before tagging.

## 4. e2e

Build the web app, then the P0 Playwright regression suite (tagged `@TC-*` under `apps/web/e2e/regression`). CI uses `E2E_AUTH_STUB=1` (deterministic stub feed). Against a seeded InsForge, keep `feed.paused` and force prices rather than wall-clock ticks.

```bash
pnpm --filter @meridian/web build
pnpm --filter @meridian/web test:e2e:regression
```

Also required before tag: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:traceability`, `pnpm docs:kb-check`.

## 5. tag

When the gate is green:

```bash
git tag -a v1.0.0 -m "Meridian v1.0 paper terminal"
git push origin v1.0.0
```

v1.0 is paper trading only. Do not enable live broker adapters.

## Demo logins (seeded env)

Emails in `mock_data/demo-users.json`. Shared demo password is the fixture value (see docs/04 test environment). Roles: trader, admin, compliance.

## Rollback notes

Migrations are append-only. Do not rewrite applied SQL. If seed counts fail, fix data and re-run `pnpm seed:all` (idempotent upserts). If the audit chain fails, stop the release and inspect `/admin/audit` — do not tag.
