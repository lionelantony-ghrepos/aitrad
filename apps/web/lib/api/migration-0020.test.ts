import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0020_copilot-actions-jwt-select.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260914110000_copilot-actions-jwt-select.sql"),
  "utf8",
);

describe("PBI-026 migration 0020 copilot_actions JWT SELECT-only", () => {
  it("lists 0020 after 0019", () => {
    expect(LOCAL_MIGRATION_IDS).toContain("0020");
    expect(LOCAL_MIGRATION_IDS.indexOf("0020")).toBeGreaterThan(
      LOCAL_MIGRATION_IDS.indexOf("0019"),
    );
  });

  it("revokes JWT writes and keeps project_admin DML", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("DROP POLICY IF EXISTS copilot_actions_insert_own");
    expect(migrationSql).toContain("DROP POLICY IF EXISTS copilot_actions_update_own");
    expect(migrationSql).toContain(
      "REVOKE INSERT, UPDATE, DELETE ON TABLE public.copilot_actions FROM anon, authenticated",
    );
    expect(migrationSql).toContain("GRANT SELECT ON TABLE public.copilot_actions TO authenticated");
    expect(migrationSql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.copilot_actions TO project_admin",
    );
  });
});
