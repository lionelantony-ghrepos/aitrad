import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const migrationSql = readFileSync(
  path.join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../../../insforge/migrations/0008_order-service.sql",
  ),
  "utf8",
);

describe("PBI-014 migration 0008 order pipeline", () => {
  it("lists 0008 after 0007", () => {
    expect(LOCAL_MIGRATION_IDS[LOCAL_MIGRATION_IDS.length - 1]).toBe("0008");
    expect(LOCAL_MIGRATION_IDS).toContain("0007");
  });

  it("adds executions, positions, snapshots, row lock reserve, and orders channel", () => {
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.executions");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.positions");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.portfolio_snapshots");
    expect(migrationSql).toContain("executions is append-only");
    expect(migrationSql).toContain("FOR UPDATE");
    expect(migrationSql).toContain("reserve_buying_power");
    expect(migrationSql).toContain("release_buying_power");
    expect(migrationSql).toContain("publish_order_event");
    expect(migrationSql).toContain("orders:*");
    expect(migrationSql).toContain("user_id = (SELECT auth.uid())");
    expect(migrationSql).toContain("reserved_cash");
  });
});
