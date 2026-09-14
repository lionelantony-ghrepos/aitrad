import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0022_monitors-jwt-owner-patch.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260914130000_monitors-jwt-owner-patch.sql"),
  "utf8",
);

describe("PBI-027 migration 0022 monitors JWT owner PATCH", () => {
  it("lists 0022 after 0021", () => {
    expect(LOCAL_MIGRATION_IDS).toContain("0022");
    expect(LOCAL_MIGRATION_IDS.indexOf("0022")).toBeGreaterThan(
      LOCAL_MIGRATION_IDS.indexOf("0021"),
    );
  });

  it("keeps JWT CRUD except last_run / compiled eval columns on UPDATE", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain(
      "REVOKE INSERT, UPDATE ON TABLE public.monitors FROM anon, authenticated",
    );
    expect(migrationSql).toContain(
      "GRANT UPDATE (name, active, throttle_state) ON TABLE public.monitors TO authenticated",
    );
    expect(migrationSql).not.toContain("GRANT UPDATE (last_run");
    expect(migrationSql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.monitors TO project_admin",
    );
  });
});
