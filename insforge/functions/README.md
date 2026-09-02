# Edge functions

Deploy with the InsForge CLI (never invent SDK APIs):

```bash
npx -y @insforge/cli functions deploy provision-account --file insforge/functions/provision-account.ts --name "Provision account"
npx -y @insforge/cli secrets add PAPER_ACCOUNT_SEED_CASH --value <same figure as packages/rules-engine paperAccountSeed>
npx -y @insforge/cli secrets add PAPER_ACCOUNT_SEED_CURRENCY --value USD
```

`provision-account` is idempotent: it creates the caller’s `profiles` + `accounts` rows once and writes `audit_log` on first create. After a successful insert it re-selects the row (InsForge insert does not return representation) and returns 500 if that select is empty. Opening cash is read from secrets, not hard-coded in the handler.
