import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MUTATING_AUDIT_SOURCES } from "./mutating-endpoints";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("TC-029-02 mutation sweep (AC-029-02)", () => {
  it("every mutating surface writes audit_log via the shared helper or repository", () => {
    expect(MUTATING_AUDIT_SOURCES.length).toBeGreaterThan(10);
    for (const source of MUTATING_AUDIT_SOURCES) {
      const text = readFileSync(path.join(repoRoot, source.path), "utf8");
      const usesHelper = text.includes("writeAuditLog(");
      const usesRepo = text.includes("createAuditLogRepository");
      expect(usesHelper || usesRepo, source.id).toBe(true);
    }
  });
});
