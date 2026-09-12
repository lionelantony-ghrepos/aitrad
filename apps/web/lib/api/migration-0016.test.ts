import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0016_user-roles.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260911200000_user-roles.sql"),
  "utf8",
);

describe("PBI-024 migration 0016 user_roles", () => {
  it("lists 0016 after 0015", () => {
    expect(LOCAL_MIGRATION_IDS).toContain("0016");
    expect(LOCAL_MIGRATION_IDS).toContain("0015");
    expect(LOCAL_MIGRATION_IDS.indexOf("0016")).toBeGreaterThan(
      LOCAL_MIGRATION_IDS.indexOf("0015"),
    );
  });

  it("creates user_roles with own-select RLS and admin directory RPC", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.user_roles");
    expect(migrationSql).toContain(
      "CONSTRAINT user_roles_role_chk CHECK (role IN ('trader', 'admin', 'compliance'))",
    );
    expect(migrationSql).toContain("user_roles_select_own");
    expect(migrationSql).toContain("GRANT SELECT ON TABLE public.user_roles TO authenticated");
    expect(migrationSql).not.toContain("GRANT INSERT ON TABLE public.user_roles TO authenticated");
    expect(migrationSql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_roles TO project_admin",
    );
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.list_user_directory");
    expect(migrationSql).toContain(
      "GRANT EXECUTE ON FUNCTION public.list_user_directory() TO project_admin",
    );
    expect(migrationSql).toContain("auth_users_default_user_role");
  });
});
