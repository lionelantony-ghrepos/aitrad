import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0007_orders.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260908160000_orders.sql"),
  "utf8",
);

describe("PBI-013 migration 0007 orders", () => {
  it("lists 0007 after 0006", () => {
    expect(LOCAL_MIGRATION_IDS).toContain("0007");
    expect(LOCAL_MIGRATION_IDS).toContain("0006");
  });

  it("creates owner-only orders with FSM status check", () => {
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.orders");
    expect(migrationSql).toContain("orders_select_own");
    expect(migrationSql).toContain("partially_filled");
    expect(migrationSql).toContain("user_id = (SELECT auth.uid())");
  });

  it("authenticated is SELECT-only; writes stay on project_admin", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("REVOKE ALL ON TABLE public.orders FROM anon, authenticated");
    expect(migrationSql).toContain("GRANT SELECT ON TABLE public.orders TO authenticated");
    expect(migrationSql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orders TO project_admin",
    );
    expect(migrationSql).toContain("DROP POLICY IF EXISTS orders_insert_own");
    expect(migrationSql).toContain("DROP POLICY IF EXISTS orders_update_own");
    expect(migrationSql).toContain("DROP POLICY IF EXISTS orders_delete_own");
    expect(migrationSql).not.toMatch(/CREATE POLICY orders_insert_own/);
    expect(migrationSql).not.toMatch(/CREATE POLICY orders_update_own/);
    expect(migrationSql).not.toMatch(/CREATE POLICY orders_delete_own/);
    expect(migrationSql).not.toMatch(/FOR INSERT TO authenticated/);
    expect(migrationSql).not.toMatch(/FOR UPDATE TO authenticated/);
    expect(migrationSql).not.toMatch(/FOR DELETE TO authenticated/);
    expect(migrationSql).not.toMatch(
      /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orders TO authenticated/,
    );
  });
});
