import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const migrationSql = readFileSync(
  path.join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../../../insforge/migrations/0005_rules-storage.sql",
  ),
  "utf8",
);

describe("PBI-011 migration 0005", () => {
  it("lists 0005 after 0004", () => {
    expect(LOCAL_MIGRATION_IDS).toEqual(["0001", "0002", "0003", "0004", "0005", "0006"]);
  });

  it("creates rules tables, append-only rule_audit, and rules:published channel", () => {
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.rule_sets");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.decision_tables");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.decision_rows");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.rule_bindings");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.rule_audit");
    expect(migrationSql).toContain("draft");
    expect(migrationSql).toContain("published");
    expect(migrationSql).toContain("retired");
    expect(migrationSql).toContain("hit_policy");
    expect(migrationSql).toContain("latency_ms");
    expect(migrationSql).toContain("rule_audit_append_only");
    expect(migrationSql).toContain("publish_rules_published");
    expect(migrationSql).toContain("rules:published");
    expect(migrationSql).toContain("VALUES ('rules'");
  });
});
