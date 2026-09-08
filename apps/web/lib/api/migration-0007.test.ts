import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const migrationSql = readFileSync(
  path.join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../../../insforge/migrations/0007_orders.sql",
  ),
  "utf8",
);

describe("PBI-013 migration 0007 orders", () => {
  it("lists 0007 after 0006", () => {
    expect(LOCAL_MIGRATION_IDS[LOCAL_MIGRATION_IDS.length - 1]).toBe("0007");
    expect(LOCAL_MIGRATION_IDS).toContain("0006");
  });

  it("creates owner-only orders with FSM status check", () => {
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.orders");
    expect(migrationSql).toContain("orders_select_own");
    expect(migrationSql).toContain("partially_filled");
    expect(migrationSql).toContain("user_id = (SELECT auth.uid())");
  });
});
