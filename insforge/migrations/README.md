# InsForge migrations

Schema changes live here as **numbered, append-only SQL files** (`0001_…`, `0002_…`). Never edit a file that has already been applied to a shared environment; add a new number instead.

InsForge MCP is the preferred apply path when it is connected in Cursor. This workspace currently uses the **InsForge CLI** against the linked project (`npx -y @insforge/cli`).

## How apply works

1. Each file is executed as `project_admin` inside a backend transaction. Do **not** add `BEGIN` / `COMMIT` / `ROLLBACK`.
2. The backend records the applied version. Running `db migrations up` again is a **no-op** for already-applied files (AC-002-01).
3. `0001_core-baseline.sql` is also written to be **SQL-idempotent** (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP POLICY/TRIGGER IF EXISTS`) so a second raw execute does not fail.

## CLI filename mapping

The CLI only applies files in the repo-root `migrations/` directory, named:

```text
<YYYYMMDDHHMMSS>_<lowercase-hyphen-name>.sql
```

Numbered sources in this folder are the product record. When applying with the CLI, keep a timestamped copy under `migrations/` with the **same SQL body** as the matching `000N_*.sql` file.

```bash
npx -y @insforge/cli db migrations list
npx -y @insforge/cli db migrations up --all
```

`up --all` skips versions the remote ledger already has.

## 0001 contents

| Table                  | Access                                                                   |
| ---------------------- | ------------------------------------------------------------------------ |
| `profiles`, `accounts` | RLS owner-only (`user_id = auth.uid()`)                                  |
| `instruments`          | public `SELECT` (`anon` + `authenticated`); no client writes             |
| `audit_log`            | append-only: insert/select own rows; `UPDATE`/`DELETE` revoked + trigger |
| `feature_flags`        | global rows (`user_id` null) readable; user-scoped rows owner-only       |

UUID primary keys, `created_at` / `updated_at` (except `audit_log`, which is insert-only), and `updated_at` triggers on mutable tables.
