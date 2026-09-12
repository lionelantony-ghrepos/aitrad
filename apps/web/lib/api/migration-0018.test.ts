import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0018_copilot-messages-session-rls.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260911220000_copilot-messages-session-rls.sql"),
  "utf8",
);

describe("PBI-025 migration 0018 copilot_messages session ownership RLS", () => {
  it("lists 0018 after 0017", () => {
    expect(LOCAL_MIGRATION_IDS.indexOf("0018")).toBeGreaterThan(
      LOCAL_MIGRATION_IDS.indexOf("0017"),
    );
  });

  it("requires parent-session ownership on INSERT", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("DROP POLICY IF EXISTS copilot_messages_insert_own");
    expect(migrationSql).toContain("EXISTS (");
    expect(migrationSql).toContain("FROM public.copilot_sessions s");
    expect(migrationSql).toContain("s.id = session_id");
    expect(migrationSql).toContain("s.user_id = (SELECT auth.uid())");
    expect(migrationSql).toContain("user_id = (SELECT auth.uid())");
  });
});
