import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const migrationSql = readFileSync(
  path.join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../../../insforge/migrations/0003_market-calendar-and-feed.sql",
  ),
  "utf8",
);

describe("PBI-006 migration 0003", () => {
  it("lists 0003 after 0002", () => {
    expect(LOCAL_MIGRATION_IDS).toEqual(["0001", "0002", "0003", "0004", "0005"]);
  });

  it("creates market_calendar, feed flags, quotes channel, and NYSE 2026 half-days", () => {
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.market_calendar");
    expect(migrationSql).toContain("CREATE POLICY market_calendar_select_public");
    expect(migrationSql).toContain("'feed.paused'");
    expect(migrationSql).toContain("'feed.speed'");
    expect(migrationSql).toContain("VALUES ('quotes'");
    expect(migrationSql).toContain("publish_quotes_batch");
    expect(migrationSql).toContain("SET search_path = pg_catalog, public, realtime, pg_temp");
    expect(migrationSql).toContain(
      "REVOKE EXECUTE ON FUNCTION public.publish_quotes_batch(jsonb) FROM anon, authenticated",
    );
    expect(migrationSql).toContain(
      "GRANT EXECUTE ON FUNCTION public.publish_quotes_batch(jsonb) TO project_admin",
    );
    expect(migrationSql).not.toContain("CREATE POLICY quotes_channel_select");
    expect(migrationSql).not.toContain("ALTER TABLE realtime.channels ENABLE ROW LEVEL SECURITY");
    expect(migrationSql).toContain("('2026-11-27'::date, 'NYSE', 'half'");
    expect(migrationSql).toContain("('2026-12-24'::date, 'NYSE', 'half'");
  });
});
