import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0017_copilot-sessions.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260911210000_copilot-sessions.sql"),
  "utf8",
);

describe("PBI-025 migration 0017 copilot sessions", () => {
  it("lists 0017 after 0016", () => {
    expect(LOCAL_MIGRATION_IDS).toContain("0017");
    expect(LOCAL_MIGRATION_IDS).toContain("0016");
    expect(LOCAL_MIGRATION_IDS.indexOf("0017")).toBeGreaterThan(
      LOCAL_MIGRATION_IDS.indexOf("0016"),
    );
  });

  it("creates sessions, messages, and today's count RPC", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.copilot_sessions");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.copilot_messages");
    expect(migrationSql).toContain("tool_calls JSONB");
    expect(migrationSql).toContain(
      "CREATE OR REPLACE FUNCTION public.count_copilot_user_messages_today",
    );
    expect(migrationSql).toContain(
      "GRANT SELECT, INSERT ON TABLE public.copilot_messages TO authenticated",
    );
    expect(migrationSql).toContain("CREATE POLICY copilot_messages_insert_own");
    expect(migrationSql).toContain("WITH CHECK (user_id = (SELECT auth.uid()))");
    expect(migrationSql).not.toContain("FROM public.copilot_sessions s");
  });
});
