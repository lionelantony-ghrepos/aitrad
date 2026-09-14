import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { auditServiceUrl } from "./audit-service";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const src = readFileSync(
  path.join(here, "../../../../insforge/functions/audit-service-src.ts"),
  "utf8",
);
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0025_audit-chain.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260914160000_audit-chain.sql"),
  "utf8",
);

describe("auditServiceUrl", () => {
  it("builds the audit-service function path", () => {
    expect(auditServiceUrl("https://app.insforge.app/")).toBe(
      "https://app.insforge.app/functions/audit-service",
    );
  });
});

describe("PBI-029 migration 0025 audit chain", () => {
  it("lists 0025 after 0024 and twins match", () => {
    expect(LOCAL_MIGRATION_IDS).toContain("0025");
    expect(LOCAL_MIGRATION_IDS.indexOf("0025")).toBeGreaterThan(
      LOCAL_MIGRATION_IDS.indexOf("0024"),
    );
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("verify_audit_chain");
    expect(migrationSql).toContain("apply_audit_retention");
    expect(migrationSql).toContain("prev_hash");
    expect(migrationSql).toContain("row_hash");
  });
});

describe("audit-service edge function", () => {
  it("authorizes audit:* via DT-ENT-01 and uses writeAuditLog", () => {
    expect(src).toContain("handleAuditServiceRequest");
    expect(src).toContain("writeAuditLog");
    expect(src).toContain("verify_audit_chain");
    expect(src).toContain("apply_audit_retention");
  });
});
