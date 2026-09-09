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
