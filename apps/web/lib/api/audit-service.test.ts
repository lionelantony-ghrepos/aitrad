import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { afterEach, describe, expect, it } from "vitest";
import { appendAuditLog, auditServiceUrl } from "./audit-service";
import { createAuditLogRepository } from "./audit-log";
import { LOCAL_MIGRATION_IDS } from "./migrations";
import { resetStubState, stubListAudit, stubSignUp } from "../auth/stub-store";

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

const WEB_MUTATION_ACTIONS = [
  "alerts.ts",
  "screener.ts",
  "monitors.ts",
  "watchlists.ts",
  "briefs.ts",
  "auth.ts",
] as const;

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

describe("web audit_log writes", () => {
  it("does not JWT REST-insert audit_log from server actions", () => {
    for (const file of WEB_MUTATION_ACTIONS) {
      const text = readFileSync(path.join(here, `../../app/actions/${file}`), "utf8");
      expect(text, file).not.toMatch(/createAuditLogRepository\([^)]*\)\.insert/);
      expect(text, file).toContain("appendAuditLog");
    }
  });

  it("createAuditLogRepository cannot insert over JWT REST", () => {
    expect(() => createAuditLogRepository()).toThrow(/appendAuditLog/);
  });
});

describe("appendAuditLog", () => {
  const prevStub = process.env.E2E_AUTH_STUB;

  afterEach(() => {
    if (prevStub === undefined) {
      delete process.env.E2E_AUTH_STUB;
    } else {
      process.env.E2E_AUTH_STUB = prevStub;
    }
  });

  it("records into the stub store under E2E_AUTH_STUB", async () => {
    process.env.E2E_AUTH_STUB = "1";
    resetStubState();
    const user = stubSignUp("audit-append@example.com", "secret");
    await appendAuditLog({
      userId: user.id,
      accessToken: user.id,
      action: "watchlist:create",
      entity_type: "watchlists",
      entity_id: "55555555-5555-4555-8555-555555555555",
      payload: { name: "Core" },
    });
    const rows = stubListAudit({ action: "watchlist:create", user_id: user.id });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.user_id).toBe(user.id);
    expect(rows[0]?.entity_type).toBe("watchlists");
  });

  it("posts op append to audit-service on the live path", async () => {
    delete process.env.E2E_AUTH_STUB;
    const seen: unknown[] = [];
    await appendAuditLog({
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      accessToken: "tok",
      action: "watchlist:create",
      entity_type: "watchlists",
      entity_id: "55555555-5555-4555-8555-555555555555",
      payload: { name: "Core" },
      baseUrl: "https://app.insforge.app",
      fetchImpl: async (_url, init) => {
        seen.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    });
    expect(seen).toEqual([
      {
        op: "append",
        action: "watchlist:create",
        entity_type: "watchlists",
        entity_id: "55555555-5555-4555-8555-555555555555",
        payload: { name: "Core" },
      },
    ]);
  });
});
