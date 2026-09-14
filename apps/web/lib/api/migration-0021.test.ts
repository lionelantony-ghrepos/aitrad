import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0021_monitors.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260914120000_monitors.sql"),
  "utf8",
);

describe("PBI-027 migration 0021 monitors", () => {
  it("lists 0021 after 0020", () => {
    expect(LOCAL_MIGRATION_IDS).toContain("0021");
    expect(LOCAL_MIGRATION_IDS.indexOf("0021")).toBeGreaterThan(
      LOCAL_MIGRATION_IDS.indexOf("0020"),
    );
  });

  it("creates owner CRUD monitors and XOR alert source", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.monitors");
    expect(migrationSql).toContain("CREATE POLICY monitors_select_own");
    expect(migrationSql).toContain("CREATE POLICY monitors_insert_own");
    expect(migrationSql).toContain("CREATE POLICY monitors_update_own");
    expect(migrationSql).toContain("CREATE POLICY monitors_delete_own");
    expect(migrationSql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.monitors TO authenticated",
    );
    expect(migrationSql).toContain("count_user_monitors");
    expect(migrationSql).toContain("alerts_source_chk");
  });
});
