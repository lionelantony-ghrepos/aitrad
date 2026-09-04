import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS, planMigrationApply } from "./migrations";

const migrationSql = readFileSync(
  path.join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../../../insforge/migrations/0002_market-bars-and-quotes.sql",
  ),
  "utf8",
);

describe("PBI-005 migration 0002", () => {
  it("lists 0002 after 0001 and skips both when applied", () => {
    expect(LOCAL_MIGRATION_IDS).toEqual(["0001", "0002", "0003", "0004"]);
    expect(planMigrationApply(["0001"]).toApply).toEqual(["0002", "0003", "0004"]);
    expect(planMigrationApply(["0001", "0002", "0003", "0004"]).toApply).toEqual([]);
  });

  it("defines market_bars composite PK, 1m|1d timeframe, and quotes_latest PK", () => {
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.market_bars");
    expect(migrationSql).toContain("PRIMARY KEY (instrument_id, timeframe, ts)");
    expect(migrationSql).toContain("timeframe IN ('1m', '1d')");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.quotes_latest");
    expect(migrationSql).toContain("instrument_id UUID PRIMARY KEY");
    expect(migrationSql).toContain("CREATE POLICY market_bars_select_public");
    expect(migrationSql).toContain("CREATE POLICY quotes_latest_select_public");
  });
});
