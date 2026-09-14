import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0023_briefs.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260914140000_briefs.sql"),
  "utf8",
);

describe("PBI-028 migration 0023 briefs", () => {
  it("lists 0023 after 0022", () => {
    expect(LOCAL_MIGRATION_IDS).toContain("0023");
    expect(LOCAL_MIGRATION_IDS.indexOf("0023")).toBeGreaterThan(
      LOCAL_MIGRATION_IDS.indexOf("0022"),
    );
  });

  it("creates briefs and morning opt-in", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.briefs");
    expect(migrationSql).toContain("kind IN ('morning', 'instrument', 'portfolio')");
    expect(migrationSql).toContain("morning_brief_opt_in");
    expect(migrationSql).toContain("content_md");
    expect(migrationSql).toContain("briefs_select_own");
  });
});
