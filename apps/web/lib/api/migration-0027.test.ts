import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0027_telemetry.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260914180000_telemetry.sql"),
  "utf8",
);

describe("PBI-030 migration 0027 telemetry", () => {
  it("lists 0027 after 0026", () => {
    expect(LOCAL_MIGRATION_IDS).toContain("0027");
    expect(LOCAL_MIGRATION_IDS.indexOf("0027")).toBeGreaterThan(
      LOCAL_MIGRATION_IDS.indexOf("0026"),
    );
  });

  it("creates telemetry with JWT no DML", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.telemetry");
    expect(migrationSql).toContain("REVOKE ALL ON TABLE public.telemetry FROM anon, authenticated");
    expect(migrationSql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.telemetry TO project_admin",
    );
    expect(migrationSql).toContain("feed.last_heartbeat");
  });
});
