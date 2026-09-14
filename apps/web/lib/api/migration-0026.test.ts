import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0026_audit-log-jwt-lock.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260914170000_audit-log-jwt-lock.sql"),
  "utf8",
);

describe("PBI-029 migration 0026 audit_log JWT no DML", () => {
  it("lists 0026 after 0025", () => {
    expect(LOCAL_MIGRATION_IDS).toContain("0026");
    expect(LOCAL_MIGRATION_IDS.indexOf("0026")).toBeGreaterThan(
      LOCAL_MIGRATION_IDS.indexOf("0025"),
    );
  });

  it("revokes JWT DML, drops own policies, and keeps project_admin DML", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("DROP POLICY IF EXISTS audit_log_insert_own");
    expect(migrationSql).toContain("DROP POLICY IF EXISTS audit_log_select_own");
    expect(migrationSql).toContain(
      "REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_log FROM anon, authenticated",
    );
    expect(migrationSql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_log TO project_admin",
    );
    expect(migrationSql).not.toMatch(/GRANT SELECT ON TABLE public\.audit_log TO authenticated/);
    expect(migrationSql).not.toMatch(
      /GRANT SELECT, INSERT ON TABLE public\.audit_log TO authenticated/,
    );
    expect(migrationSql).not.toMatch(
      /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.audit_log TO authenticated/,
    );
    expect(migrationSql).not.toMatch(/GRANT .* TO authenticated/);
    expect(migrationSql).not.toMatch(/CREATE POLICY audit_log_/);
    expect(migrationSql).not.toMatch(/FOR INSERT TO authenticated/);
    expect(migrationSql).not.toMatch(/FOR SELECT TO authenticated/);
    expect(migrationSql).not.toMatch(/FOR UPDATE TO authenticated/);
    expect(migrationSql).not.toMatch(/FOR DELETE TO authenticated/);
  });
});
