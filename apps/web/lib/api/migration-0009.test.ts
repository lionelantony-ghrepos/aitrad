import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0009_paper-matching.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260909120000_paper-matching.sql"),
  "utf8",
);

describe("PBI-015 migration 0009 paper matching", () => {
  it("lists 0009 after 0008", () => {
    expect(LOCAL_MIGRATION_IDS[LOCAL_MIGRATION_IDS.length - 1]).toBe("0009");
    expect(LOCAL_MIGRATION_IDS).toContain("0008");
  });

  it("adds stop_triggered, apply_paper_fill, and positions channel", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("stop_triggered");
    expect(migrationSql).toContain("apply_paper_fill");
    expect(migrationSql).toContain("publish_position_event");
    expect(migrationSql).toContain("positions:*");
    expect(migrationSql).toContain("FOR UPDATE");
    expect(migrationSql).toContain("REVOKE EXECUTE ON FUNCTION public.apply_paper_fill");
    expect(migrationSql).toContain("GRANT EXECUTE ON FUNCTION public.apply_paper_fill");
    expect(migrationSql).toContain(
      "REVOKE EXECUTE ON FUNCTION public.publish_position_event(uuid, jsonb) FROM anon, authenticated",
    );
    expect(migrationSql).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public.apply_paper_fill\([^)]+\) TO authenticated/,
    );
  });
});
