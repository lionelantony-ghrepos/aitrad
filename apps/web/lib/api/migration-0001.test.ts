import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS, planMigrationApply } from "./migrations";

const migrationSql = readFileSync(
  path.join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../../../insforge/migrations/0001_core-baseline.sql",
  ),
  "utf8",
);

describe("TC-002-01 migration apply is a no-op the second time", () => {
  it("skips 0001 when the remote ledger already has it", () => {
    const first = planMigrationApply([]);
    expect(first.toApply).toEqual([...LOCAL_MIGRATION_IDS]);
    expect(first.skipped).toEqual([]);

    const second = planMigrationApply(["0001"]);
    expect(second.toApply[0]).toBe("0002");
    expect(second.toApply).not.toContain("0001");
    expect(second.skipped).toEqual(["0001"]);
    const third = planMigrationApply(["0001", "0002"]);
    expect(third.toApply).not.toContain("0001");
    expect(third.toApply).not.toContain("0002");
    expect(third.skipped).toEqual(["0001", "0002"]);
  });

  it("uses IF NOT EXISTS / DROP IF EXISTS so a raw re-run of 0001 does not fail", () => {
    for (const table of ["profiles", "accounts", "instruments", "audit_log", "feature_flags"]) {
      expect(migrationSql).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
    }
    expect(migrationSql).toContain("DROP POLICY IF EXISTS");
    expect(migrationSql).toContain("DROP TRIGGER IF EXISTS");
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.audit_log_append_only");
  });
});

describe("TC-002-02 RLS owner isolation in 0001", () => {
  it("scopes profiles and accounts to auth.uid()", () => {
    expect(migrationSql).toContain("CREATE POLICY accounts_select_own");
    expect(migrationSql).toContain("CREATE POLICY profiles_select_own");
    expect(migrationSql).toMatch(/user_id = \(SELECT auth\.uid\(\)\)/);
    expect(migrationSql).toContain("CREATE POLICY instruments_select_public");
    expect(migrationSql).toContain("FOR SELECT TO anon, authenticated");
  });
});

describe("TC-002-03 audit_log append-only", () => {
  it("revokes UPDATE/DELETE and raises on mutate triggers", () => {
    expect(migrationSql).toContain("RAISE EXCEPTION 'audit_log is append-only'");
    expect(migrationSql).toContain("REVOKE UPDATE, DELETE ON TABLE public.audit_log");
    expect(migrationSql).toContain("BEFORE UPDATE ON public.audit_log");
    expect(migrationSql).toContain("BEFORE DELETE ON public.audit_log");
  });
});
