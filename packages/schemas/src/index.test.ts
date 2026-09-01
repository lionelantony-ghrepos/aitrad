import { describe, expect, it } from "vitest";
import {
  accountSchema,
  auditLogInsertSchema,
  packageName,
  profileSchema,
  publicInsforgeEnvSchema,
} from "./index";

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("@meridian/schemas", () => {
  it("exports the package name", () => {
    expect(packageName).toBe("@meridian/schemas");
  });

  it("accepts a valid public InsForge env fixture", () => {
    const parsed = publicInsforgeEnvSchema.parse({
      NEXT_PUBLIC_INSFORGE_URL: "https://example.insforge.app",
      NEXT_PUBLIC_INSFORGE_ANON_KEY: "anon-test-key",
    });
    expect(parsed.NEXT_PUBLIC_INSFORGE_ANON_KEY).toBe("anon-test-key");
  });

  it("rejects a missing anon key", () => {
    const result = publicInsforgeEnvSchema.safeParse({
      NEXT_PUBLIC_INSFORGE_URL: "https://example.insforge.app",
    });
    expect(result.success).toBe(false);
  });

  it("parses an account including NUMERIC-as-string cash_balance", () => {
    const parsed = accountSchema.parse({
      id,
      user_id: id,
      cash_balance: "1000.25",
      currency: "USD",
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    });
    expect(parsed.cash_balance).toBe(1000.25);
  });

  it("rejects an invalid profile user_id", () => {
    const result = profileSchema.safeParse({
      id,
      user_id: "not-a-uuid",
      display_name: "Ada",
      persona: null,
      experience_level: "novice",
      suitability_tier: null,
      objectives: null,
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("requires audit_log inserts to name an actor", () => {
    const result = auditLogInsertSchema.safeParse({
      action: "login",
      entity_type: "session",
    });
    expect(result.success).toBe(false);
  });
});
