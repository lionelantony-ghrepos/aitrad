import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0028_audit-insforge-compat.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260918160000_audit-insforge-compat.sql"),
  "utf8",
);

describe("migration 0028 audit InsForge compat", () => {
  it("lists 0028 after 0027", () => {
    expect(LOCAL_MIGRATION_IDS).toContain("0028");
    expect(LOCAL_MIGRATION_IDS.indexOf("0028")).toBeGreaterThan(
      LOCAL_MIGRATION_IDS.indexOf("0027"),
    );
  });

  it("replaces audit RPCs without session-config statements and twins match", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.verify_audit_chain");
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.apply_audit_retention");
    expect(migrationSql).toContain("SECURITY DEFINER");
    expect(migrationSql).toContain("public.audit_log");
    const withoutComments = migrationSql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toMatch(/SET\s+search_path/i);
    expect(withoutComments).not.toMatch(/\bset_config\b/i);
  });
});
