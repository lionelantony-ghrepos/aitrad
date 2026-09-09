import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0008_order-service.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260908214500_order-service.sql"),
  "utf8",
);

describe("PBI-014 migration 0008 order pipeline", () => {
  it("lists 0008 after 0007", () => {
    expect(LOCAL_MIGRATION_IDS[LOCAL_MIGRATION_IDS.length - 1]).toBe("0008");
    expect(LOCAL_MIGRATION_IDS).toContain("0007");
  });

  it("adds executions, positions, snapshots, row lock reserve, and orders channel", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.executions");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.positions");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.portfolio_snapshots");
    expect(migrationSql).toContain("executions is append-only");
    expect(migrationSql).toContain("FOR UPDATE");
    expect(migrationSql).toContain("reserve_buying_power");
    expect(migrationSql).toContain("release_buying_power");
    expect(migrationSql).toContain("publish_order_event");
    expect(migrationSql).toContain("orders:*");
    expect(migrationSql).toContain("user_id = (SELECT auth.uid())");
    expect(migrationSql).toContain("reserved_cash");
  });

  it("locks money columns from authenticated UPDATE", () => {
    expect(migrationSql).toContain("accounts_protect_money_columns");
    expect(migrationSql).toContain("account money columns are service-managed");
    expect(migrationSql).toContain(
      "GRANT UPDATE (currency, updated_at) ON TABLE public.accounts TO authenticated",
    );
    expect(migrationSql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.accounts TO project_admin",
    );
    expect(migrationSql).not.toMatch(/GRANT UPDATE \([^)]*cash_balance/);
    expect(migrationSql).not.toMatch(/GRANT UPDATE \([^)]*reserved_cash/);
  });

  it("authenticated is SELECT-only on executions, positions, and snapshots", () => {
    expect(migrationSql).toContain("GRANT SELECT ON TABLE public.executions TO authenticated");
    expect(migrationSql).toContain("GRANT SELECT ON TABLE public.positions TO authenticated");
    expect(migrationSql).toContain(
      "GRANT SELECT ON TABLE public.portfolio_snapshots TO authenticated",
    );
    expect(migrationSql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.executions TO project_admin",
    );
    expect(migrationSql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.positions TO project_admin",
    );
    expect(migrationSql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.portfolio_snapshots TO project_admin",
    );
    expect(migrationSql).toContain("DROP POLICY IF EXISTS executions_insert_own");
    expect(migrationSql).toContain("DROP POLICY IF EXISTS positions_insert_own");
    expect(migrationSql).toContain("DROP POLICY IF EXISTS positions_update_own");
    expect(migrationSql).toContain("DROP POLICY IF EXISTS positions_delete_own");
    expect(migrationSql).toContain("DROP POLICY IF EXISTS portfolio_snapshots_insert_own");
    expect(migrationSql).not.toMatch(/CREATE POLICY executions_insert_own/);
    expect(migrationSql).not.toMatch(/CREATE POLICY positions_insert_own/);
    expect(migrationSql).not.toMatch(/CREATE POLICY positions_update_own/);
    expect(migrationSql).not.toMatch(/CREATE POLICY positions_delete_own/);
    expect(migrationSql).not.toMatch(/CREATE POLICY portfolio_snapshots_insert_own/);
    expect(migrationSql).not.toMatch(/FOR INSERT TO authenticated/);
    expect(migrationSql).not.toMatch(/FOR UPDATE TO authenticated/);
    expect(migrationSql).not.toMatch(/FOR DELETE TO authenticated/);
  });

  it("reserves and publishes via project_admin EXECUTE and p_user_id ownership", () => {
    expect(migrationSql).toContain("p_user_id uuid");
    expect(migrationSql).toContain("rec.user_id IS DISTINCT FROM p_user_id");
    expect(migrationSql).toContain(
      "REVOKE EXECUTE ON FUNCTION public.reserve_buying_power(uuid, numeric, uuid) FROM anon, authenticated",
    );
    expect(migrationSql).toContain(
      "GRANT EXECUTE ON FUNCTION public.reserve_buying_power(uuid, numeric, uuid) TO project_admin",
    );
    expect(migrationSql).toContain(
      "REVOKE EXECUTE ON FUNCTION public.release_buying_power(uuid, numeric, uuid) FROM anon, authenticated",
    );
    expect(migrationSql).toContain(
      "GRANT EXECUTE ON FUNCTION public.release_buying_power(uuid, numeric, uuid) TO project_admin",
    );
    expect(migrationSql).toContain(
      "REVOKE EXECUTE ON FUNCTION public.publish_order_event(uuid, jsonb) FROM anon, authenticated",
    );
    expect(migrationSql).toContain(
      "GRANT EXECUTE ON FUNCTION public.publish_order_event(uuid, jsonb) TO project_admin",
    );
    expect(migrationSql).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public.reserve_buying_power\([^)]+\) TO authenticated/,
    );
    expect(migrationSql).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public.release_buying_power\([^)]+\) TO authenticated/,
    );
    expect(migrationSql).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public.publish_order_event\([^)]+\) TO authenticated/,
    );
    expect(migrationSql).not.toContain("rec.user_id IS DISTINCT FROM auth.uid()");
  });
});
