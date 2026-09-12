import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0014_alerts.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260909210000_alerts.sql"),
  "utf8",
);

describe("PBI-022 migration 0014 alerts", () => {
  it("lists 0014 after 0013", () => {
    expect(LOCAL_MIGRATION_IDS).toContain("0014");
    expect(LOCAL_MIGRATION_IDS).toContain("0013");
    expect(LOCAL_MIGRATION_IDS.indexOf("0014")).toBeGreaterThan(
      LOCAL_MIGRATION_IDS.indexOf("0013"),
    );
  });

  it("creates owner alert_rules, runner-written alerts, and alerts:* publish", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.alert_rules");
    expect(migrationSql).toContain("condition JSONB NOT NULL");
    expect(migrationSql).toContain("throttle_state JSONB NOT NULL");
    expect(migrationSql).toContain("CREATE POLICY alert_rules_select_own");
    expect(migrationSql).toContain("user_id = (SELECT auth.uid())");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.alerts");
    expect(migrationSql).toContain("read BOOLEAN NOT NULL DEFAULT false");
    expect(migrationSql).toContain("GRANT SELECT, UPDATE ON TABLE public.alerts TO authenticated");
    expect(migrationSql).not.toContain("GRANT INSERT ON TABLE public.alerts TO authenticated");
    expect(migrationSql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.alerts TO project_admin",
    );
    expect(migrationSql).toContain("VALUES ('alerts:*'");
    expect(migrationSql).toContain(
      "CREATE OR REPLACE FUNCTION public.publish_alert_event(p_user_id uuid, payload jsonb)",
    );
    expect(migrationSql).toContain(
      "GRANT EXECUTE ON FUNCTION public.publish_alert_event(uuid, jsonb) TO project_admin",
    );
    expect(migrationSql).toContain(
      "REVOKE EXECUTE ON FUNCTION public.publish_alert_event(uuid, jsonb) FROM anon, authenticated",
    );
  });
});
