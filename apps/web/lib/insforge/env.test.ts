import { afterEach, describe, expect, it } from "vitest";
import { tryReadPublicInsforgeEnv } from "./env";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_INSFORGE_URL;
  delete process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
});

describe("tryReadPublicInsforgeEnv", () => {
  it("returns null when public InsForge env is unset", () => {
    delete process.env.NEXT_PUBLIC_INSFORGE_URL;
    delete process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
    expect(tryReadPublicInsforgeEnv()).toBeNull();
  });

  it("returns baseUrl and anonKey when both are set", () => {
    process.env.NEXT_PUBLIC_INSFORGE_URL = "https://example.insforge.app";
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY = "anon-test-key";
    expect(tryReadPublicInsforgeEnv()).toEqual({
      baseUrl: "https://example.insforge.app",
      anonKey: "anon-test-key",
    });
  });
});
