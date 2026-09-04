import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const migrationSql = readFileSync(
  path.join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../../../insforge/migrations/0004_watchlists.sql",
  ),
  "utf8",
);

describe("PBI-007 migration 0004", () => {
  it("lists 0004 after 0003", () => {
    expect(LOCAL_MIGRATION_IDS).toEqual(["0001", "0002", "0003", "0004"]);
  });

  it("creates owner-only watchlists with unique items", () => {
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.watchlists");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.watchlist_items");
    expect(migrationSql).toContain(
      "CONSTRAINT watchlist_items_watchlist_instrument_key UNIQUE (watchlist_id, instrument_id)",
    );
    expect(migrationSql).toContain("CREATE POLICY watchlists_select_own");
    expect(migrationSql).toContain("CREATE POLICY watchlist_items_insert_own");
    expect(migrationSql).toContain("user_id = (SELECT auth.uid())");
    expect(migrationSql).not.toContain("TO anon");
  });
});
