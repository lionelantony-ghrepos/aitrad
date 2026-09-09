import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0012_fundamentals.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260909190000_fundamentals.sql"),
  "utf8",
);

describe("PBI-020 migration 0012 fundamentals", () => {
  it("lists 0012 after 0011", () => {
    expect(LOCAL_MIGRATION_IDS).toContain("0012");
    expect(LOCAL_MIGRATION_IDS.indexOf("0012")).toBeGreaterThan(
      LOCAL_MIGRATION_IDS.indexOf("0011"),
    );
  });

  it("creates fundamentals with public SELECT and admin writes", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.fundamentals");
    expect(migrationSql).toContain("instrument_id UUID PRIMARY KEY");
    expect(migrationSql).toContain("metrics JSONB NOT NULL");
    expect(migrationSql).toContain("metrics ? 'valuation'");
    expect(migrationSql).toContain("metrics ? 'analyst'");
    expect(migrationSql).toContain("CREATE POLICY fundamentals_select_public");
    expect(migrationSql).toContain("FOR SELECT TO anon, authenticated");
    expect(migrationSql).toContain(
      "GRANT SELECT ON TABLE public.fundamentals TO anon, authenticated",
    );
    expect(migrationSql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fundamentals TO project_admin",
    );
    expect(migrationSql).not.toContain("FOR INSERT TO authenticated");
    expect(migrationSql).not.toContain("FOR INSERT TO anon");
  });
});
