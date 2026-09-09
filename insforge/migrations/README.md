# InsForge migrations

Schema changes live here as **numbered, append-only SQL files** (`0001_…`, `0002_…`). Never edit a file that has already been applied to a shared environment; add a new number instead.

InsForge MCP is the apply path for a **hosted** project when it is connected in Cursor. This workspace’s default backend is **local Docker InsForge**. After `npx -y @insforge/cli local start`, the same CLI targets this directory’s stack (`npx -y @insforge/cli db …`) with no cloud login.

## How apply works

1. Each file is executed as `project_admin` inside a backend transaction. Do **not** add `BEGIN` / `COMMIT` / `ROLLBACK`.
2. The backend records the applied version. Running `db migrations up` again is a **no-op** for already-applied files (AC-002-01).
3. `0001_core-baseline.sql` is also written to be **SQL-idempotent** (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP POLICY/TRIGGER IF EXISTS`) so a second raw execute does not fail.

## CLI filename mapping

The CLI only applies files in the repo-root `migrations/` directory, named:

```text
<YYYYMMDDHHMMSS>_<lowercase-hyphen-name>.sql
```

That folder must contain **only** those `.sql` files. A `README.md` (or any other name) makes `db migrations up` fail with `Invalid migration filename`.

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

## 0002 contents

| Table                          | Access                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `market_bars`, `quotes_latest` | public `SELECT`; no client writes (seed uses admin)                            |
| `instruments` extra columns    | `market_cap_band`, `beta_class`, `avg_volume`, `avg_volume_band`, `base_price` |

## 0003 contents

| Table / object                               | Access                                |
| -------------------------------------------- | ------------------------------------- |
| `market_calendar`                            | public `SELECT`; admin/seed writes    |
| `feature_flags` `feed.paused` / `feed.speed` | global rows for mock feed control     |
| realtime channel `quotes`                    | `publish_quotes_batch(payload jsonb)` |

## 0004 contents

| Table             | Access                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| `watchlists`      | RLS owner-only (`user_id = auth.uid()`); authenticated CRUD            |
| `watchlist_items` | RLS via parent watchlist owner; `UNIQUE (watchlist_id, instrument_id)` |

## 0005 contents

| Table / object                                                   | Access                                                           |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| `rule_sets`, `decision_tables`, `decision_rows`, `rule_bindings` | authenticated `SELECT`; writes via admin / `rules-service`       |
| `rule_audit`                                                     | append-only; authenticated `SELECT` own or null `user_id`        |
| realtime channel `rules`                                         | `publish_rules_published(payload jsonb)` event `rules:published` |
| `feature_flags` `rules.publish_generation`                       | cache epoch for warm isolates                                    |

## 0006 contents

| Object             | Access                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles.persona` | authenticated cannot INSERT/UPDATE the column; trigger + insert `WITH CHECK (persona IS NULL)`; `project_admin` / service still set role |

## 0007 contents

| Table    | Access                                                                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orders` | RLS owner SELECT (`user_id = auth.uid()`); authenticated SELECT-only. Writes via `order-service` (`project_admin` / API key). FSM reserve / executions land in PBI-014. |

## 0008 contents

| Table / object                                  | Access                                                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `accounts.cash_balance` / `reserved_cash`       | Client SELECT own row; UPDATE locked (column grants + trigger). Writes via `project_admin` / reserve RPC |
| `orders.reserved_amount`                        | Owner SELECT; writes via order-service admin                                                             |
| `executions`                                    | Append-only; authenticated SELECT-only. Writes via `project_admin`                                       |
| `positions`, `portfolio_snapshots`              | Authenticated SELECT-only. Writes via `project_admin`                                                    |
| `reserve_buying_power` / `release_buying_power` | `SELECT … FOR UPDATE`; EXECUTE `project_admin` only; `p_user_id` must match `rec.user_id`                |
| realtime channel `orders:*`                     | `publish_order_event(user_id, payload)` event `order`; EXECUTE `project_admin` only                      |

## 0009 contents

| Table / object                 | Access                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `orders.stop_triggered`        | Owner SELECT; writes via matching-runner admin                                                    |
| `apply_paper_fill`             | Locks order + account + position; asserts filled_qty and cash_delta; inserts execution; upserts position; adjusts cash. EXECUTE `project_admin` |
| realtime channel `positions:*` | `publish_position_event(user_id, payload)` event `position`; EXECUTE `project_admin` only         |

UUID primary keys, `created_at` / `updated_at` (except `audit_log` and `executions`, which are insert-only), and `updated_at` triggers on mutable tables.
