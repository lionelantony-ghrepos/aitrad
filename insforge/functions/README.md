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

`order-service` accepts `POST` `{ op: "preview" | "create", draft, last_price }` (or `/preview` / `/orders` path suffixes). Preview evaluates DT-VAL-01, DT-RISK-01, and DT-FEE-01 via `rules-service` and returns pass/fail reasons plus fee estimate. Create re-previews, writes `orders` when it passes, and always writes `audit_log`. Buying-power reserve and full FSM are PBI-014.
