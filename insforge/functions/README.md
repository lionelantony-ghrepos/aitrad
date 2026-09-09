# Edge functions

Deploy with the InsForge CLI (never invent SDK APIs):

```bash
npx -y @insforge/cli functions deploy provision-account --file insforge/functions/provision-account.ts --name "Provision account"
npx -y @insforge/cli secrets add PAPER_ACCOUNT_SEED_CASH --value <same figure as packages/rules-engine paperAccountSeed>
npx -y @insforge/cli secrets add PAPER_ACCOUNT_SEED_CURRENCY --value USD
```

`provision-account` is idempotent: it creates the caller’s `profiles` + `accounts` rows once and writes `audit_log` on first create. After a successful insert it re-selects the row (InsForge insert does not return representation) and returns 500 if that select is empty. Opening cash is read from secrets, not hard-coded in the handler.

```bash
pnpm functions:bundle:rules-service
npx -y @insforge/cli functions deploy rules-service --file insforge/functions/rules-service.ts --name "Rules service"
```

`rules-service` evaluates `evaluateDomain(domain, context)` against published tables (in-memory cache, invalidated by realtime `rules:published` or service-only `op: "invalidate"` / `op: "publish"`). User JWTs may evaluate only; they cannot supply `clock`. Missing `API_KEY` / `INSFORGE_API_KEY` fails closed. Every evaluation writes `rule_audit` and `audit_log`. Seed baseline tables with `pnpm seed:rules`.

```bash
pnpm functions:bundle:order-service
npx -y @insforge/cli functions deploy order-service --file insforge/functions/order-service.ts --name "Order service"
```

`order-service` accepts `POST` `{ op: "preview" | "create" | "cancel", … }` (paths `/preview`, `/orders`, `/orders/:id/cancel`). Rule facts use `quotes_latest.last` via `lastPriceForRuleFacts` (client `last_price` is ignored). Preview evaluates DT-VAL-01, DT-RISK-01, DT-HRS-01, and DT-FEE-01 via `rules-service` and writes only `rule_audit`. Create evaluates those domains in order, then uses `createAdminClient` (`API_KEY` / `INSFORGE_API_KEY`) to reserve buying power (`reserve_buying_power` row lock + `p_user_id`), insert `accepted` or `rejected`, and publish `orders:{userId}`. Authenticated JWTs cannot EXECUTE reserve/release/publish. Cancel is FSM-guarded (`accepted` / `working` / `partially_filled`) and also uses the admin writer.

```bash
pnpm functions:bundle:matching-runner
npx -y @insforge/cli functions deploy matching-runner --file insforge/functions/matching-runner.ts --name "Matching runner"
```

`matching-runner` is service-key only. On each tick batch it promotes `accepted` → `working`, evaluates `execution_sim` (DT-EXEC-01), and applies fills through `apply_paper_fill` (executions, positions, cash, reserve release). It publishes `orders:{userId}` and `positions:{userId}` and writes `audit_log` per fill. `market-tick` invokes it after publishing quotes; feed test mode (`feed.paused` + `feed.force_price`) is the integration path for a limit cross.

```bash
pnpm functions:bundle:analytics-service
npx -y @insforge/cli functions deploy analytics-service --file insforge/functions/analytics-service.ts --name "Analytics service"
```

`analytics-service` accepts `POST` `{ op: "portfolio" | "snapshot" }` (paths `/portfolio`, `/snapshot`). `/portfolio` is a user JWT read (`authorize` `portfolio:read`) that marks positions against `quotes_latest` with P&L from `@meridian/schemas/analytics`. `/snapshot` is service-key only: after the NYSE close minute it inserts one `portfolio_snapshots` row per account (idempotent on `account_id + as_of_date`) and writes `audit_log`. Schedule the snapshot op at or after the close (interval syntax; the handler no-ops while the session is OPEN).
