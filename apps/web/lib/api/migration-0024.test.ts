import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0024_briefs-jwt-select.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260914150000_briefs-jwt-select.sql"),
  "utf8",
);

describe("PBI-028 migration 0024 briefs JWT SELECT-only", () => {
  it("lists 0024 after 0023", () => {
    expect(LOCAL_MIGRATION_IDS).toContain("0024");
    expect(LOCAL_MIGRATION_IDS.indexOf("0024")).toBeGreaterThan(
      LOCAL_MIGRATION_IDS.indexOf("0023"),
    );
  });

  it("revokes JWT writes and keeps project_admin DML", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("DROP POLICY IF EXISTS briefs_insert_own");
    expect(migrationSql).toContain("DROP POLICY IF EXISTS briefs_update_own");
    expect(migrationSql).toContain("DROP POLICY IF EXISTS briefs_delete_own");
    expect(migrationSql).toContain(
      "REVOKE INSERT, UPDATE, DELETE ON TABLE public.briefs FROM anon, authenticated",
    );
    expect(migrationSql).toContain("GRANT SELECT ON TABLE public.briefs TO authenticated");
    expect(migrationSql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.briefs TO project_admin",
    );
    expect(migrationSql).not.toMatch(/CREATE POLICY briefs_insert_own/);
    expect(migrationSql).not.toMatch(/CREATE POLICY briefs_update_own/);
    expect(migrationSql).not.toMatch(/CREATE POLICY briefs_delete_own/);
    expect(migrationSql).not.toMatch(/FOR INSERT TO authenticated/);
    expect(migrationSql).not.toMatch(/FOR UPDATE TO authenticated/);
    expect(migrationSql).not.toMatch(/FOR DELETE TO authenticated/);
    expect(migrationSql).not.toMatch(
      /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.briefs TO authenticated/,
    );
  });
});
