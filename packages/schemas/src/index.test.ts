import { describe, expect, it } from "vitest";
import { packageName, publicInsforgeEnvSchema } from "./index";

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
});
