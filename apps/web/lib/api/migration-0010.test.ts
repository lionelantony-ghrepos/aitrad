import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0010_advanced-orders.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260909140000_advanced-orders.sql"),
  "utf8",
);

describe("PBI-016 migration 0010 advanced orders", () => {
  it("lists 0010 after 0009", () => {
    expect(LOCAL_MIGRATION_IDS[LOCAL_MIGRATION_IDS.length - 1]).toBe("0010");
    expect(LOCAL_MIGRATION_IDS).toContain("0009");
  });

  it("adds group and trailing columns", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("group_id");
    expect(migrationSql).toContain("leg_role");
    expect(migrationSql).toContain("trail_type");
    expect(migrationSql).toContain("high_water_mark");
    expect(migrationSql).toContain("group_activated");
  });
});
