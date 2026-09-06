import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const migrationSql = readFileSync(
  path.join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../../../insforge/migrations/0006_protect-profile-persona.sql",
  ),
  "utf8",
);

describe("PBI-012 migration 0006 persona lock", () => {
  it("lists 0006 after 0005", () => {
    expect(LOCAL_MIGRATION_IDS[LOCAL_MIGRATION_IDS.length - 1]).toBe("0006");
    expect(LOCAL_MIGRATION_IDS).toContain("0005");
  });

  it("blocks authenticated persona writes via trigger, insert check, and column grants", () => {
    expect(migrationSql).toContain("profiles_protect_persona");
    expect(migrationSql).toContain("persona is service-managed");
    expect(migrationSql).toContain("AND persona IS NULL");
    expect(migrationSql).toContain("GRANT UPDATE (");
    expect(migrationSql).not.toMatch(/GRANT UPDATE \([^)]*persona/);
    expect(migrationSql).not.toMatch(/GRANT INSERT \([^)]*persona/);
  });
});
