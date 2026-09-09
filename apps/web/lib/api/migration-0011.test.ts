import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0011_news-items.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260909180000_news-items.sql"),
  "utf8",
);

describe("PBI-019 migration 0011 news_items", () => {
  it("lists 0011 after 0010", () => {
    expect(LOCAL_MIGRATION_IDS[LOCAL_MIGRATION_IDS.length - 1]).toBe("0011");
    expect(LOCAL_MIGRATION_IDS).toContain("0010");
  });

  it("creates news_items, public SELECT, and news realtime publish", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.news_items");
    expect(migrationSql).toContain(
      "event_type IN ('earnings', 'analyst', 'macro', 'product', 'regulatory', 'mna')",
    );
    expect(migrationSql).toContain("sentiment >= -1 AND sentiment <= 1");
    expect(migrationSql).toContain("CREATE POLICY news_items_select_public");
    expect(migrationSql).toContain("publish_news_batch");
    expect(migrationSql).toContain("SET search_path = pg_catalog, public, realtime, pg_temp");
    expect(migrationSql).toContain(
      "GRANT SELECT ON TABLE public.news_items TO anon, authenticated",
    );
    expect(migrationSql).not.toContain("FOR INSERT TO authenticated");
  });
});
