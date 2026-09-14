import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0019_copilot-actions.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260914100000_copilot-actions.sql"),
  "utf8",
);

describe("PBI-026 migration 0019 copilot actions", () => {
  it("lists 0019 after 0018", () => {
    expect(LOCAL_MIGRATION_IDS).toContain("0019");
    expect(LOCAL_MIGRATION_IDS.indexOf("0019")).toBeGreaterThan(
      LOCAL_MIGRATION_IDS.indexOf("0018"),
    );
  });

  it("creates copilot_actions and today's count RPC", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.copilot_actions");
    expect(migrationSql).toContain("proposed");
    expect(migrationSql).toContain("auto_approved");
    expect(migrationSql).toContain("executed_ref");
    expect(migrationSql).toContain(
      "CREATE OR REPLACE FUNCTION public.count_copilot_user_actions_today",
    );
    expect(migrationSql).toContain("GRANT SELECT, INSERT, UPDATE ON TABLE public.copilot_actions");
  });
});
