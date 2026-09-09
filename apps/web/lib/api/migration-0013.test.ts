import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0013_screener.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260909200000_screener.sql"),
  "utf8",
);

describe("PBI-021 migration 0013 screener", () => {
  it("lists 0013 after 0012", () => {
    expect(LOCAL_MIGRATION_IDS[LOCAL_MIGRATION_IDS.length - 1]).toBe("0013");
    expect(LOCAL_MIGRATION_IDS).toContain("0012");
  });

  it("creates owner screens, daily RSI, and parameterized exec_screener", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.screens");
    expect(migrationSql).toContain("criteria JSONB NOT NULL");
    expect(migrationSql).toContain("CONSTRAINT screens_user_name_key UNIQUE (user_id, name)");
    expect(migrationSql).toContain("CREATE POLICY screens_select_own");
    expect(migrationSql).toContain("user_id = (SELECT auth.uid())");
    expect(migrationSql).toContain("FOR SELECT TO authenticated");
    expect(migrationSql).toContain("FOR INSERT TO authenticated");
    expect(migrationSql).not.toContain("ON public.screens\n  FOR SELECT TO anon");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.instrument_daily_rsi");
    expect(migrationSql).toContain("rsi_14");
    expect(migrationSql).toContain("CREATE POLICY instrument_daily_rsi_select_public");
    expect(migrationSql).toContain("FOR SELECT TO anon, authenticated");
    expect(migrationSql).toContain(
      "GRANT SELECT ON TABLE public.instrument_daily_rsi TO anon, authenticated",
    );
    expect(migrationSql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.instrument_daily_rsi TO project_admin",
    );
    expect(migrationSql).not.toContain("ON public.instrument_daily_rsi\n  FOR INSERT");
    expect(migrationSql).toContain(
      "CREATE OR REPLACE FUNCTION public.exec_screener(p_sql text, p_params jsonb)",
    );
    expect(migrationSql).toContain("EXECUTE p_sql USING");
    expect(migrationSql).toContain(
      "GRANT EXECUTE ON FUNCTION public.exec_screener(text, jsonb) TO project_admin",
    );
    expect(migrationSql).toContain(
      "REVOKE ALL ON FUNCTION public.exec_screener(text, jsonb) FROM anon, authenticated",
    );
    expect(migrationSql).not.toContain(
      "GRANT EXECUTE ON FUNCTION public.exec_screener(text, jsonb) TO authenticated",
    );
  });
});
