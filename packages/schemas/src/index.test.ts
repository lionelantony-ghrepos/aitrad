import { describe, expect, it } from "vitest";
import {
  credentialsSchema,
  packageName,
  profileWizardSchema,
  provisionResultSchema,
  publicInsforgeEnvSchema,
  workspaceLayoutV1Schema,
} from "./index";

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

  it("parses wizard and credential payloads", () => {
    expect(
      profileWizardSchema.parse({
        display_name: "Ada",
        experience_level: "novice",
        objectives: "learn",
      }).experience_level,
    ).toBe("novice");
    expect(credentialsSchema.safeParse({ email: "bad", password: "x" }).success).toBe(false);
  });

  it("parses a provision result envelope", () => {
    const parsed = provisionResultSchema.parse({
      profile: {
        id: "11111111-1111-4111-8111-111111111111",
        user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        display_name: null,
        persona: null,
        experience_level: null,
        suitability_tier: null,
        objectives: null,
        created_at: "2026-09-02T00:00:00.000Z",
        updated_at: "2026-09-02T00:00:00.000Z",
      },
      account: {
        id: "22222222-2222-4222-8222-222222222222",
        user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        cash_balance: "2500",
        currency: "USD",
        created_at: "2026-09-02T00:00:00.000Z",
        updated_at: "2026-09-02T00:00:00.000Z",
      },
      created: { profile: true, account: true },
    });
    expect(parsed.account.cash_balance).toBe(2500);
  });

  it("re-exports workspaceLayoutV1Schema from the package barrel", () => {
    const parsed = workspaceLayoutV1Schema.parse({
      version: 1,
      dockview: { grid: {} },
    });
    expect(parsed.version).toBe(1);
  });
});
