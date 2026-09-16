import { describe, expect, it } from "vitest";
import { overlayLocalInsforgeEnv, parseDotEnv } from "./apply-local-env";

describe("parseDotEnv", () => {
  it("skips comments and unwraps quotes", () => {
    const parsed = parseDotEnv(
      [
        "# ignore",
        "NEXT_PUBLIC_INSFORGE_URL=http://127.0.0.1:7130",
        "NEXT_PUBLIC_INSFORGE_ANON_KEY='anon_test'",
        "OTHER=stay",
        "",
      ].join("\n"),
    );
    expect(parsed.NEXT_PUBLIC_INSFORGE_URL).toBe("http://127.0.0.1:7130");
    expect(parsed.NEXT_PUBLIC_INSFORGE_ANON_KEY).toBe("anon_test");
    expect(parsed.OTHER).toBe("stay");
  });
});

describe("overlayLocalInsforgeEnv", () => {
  it("overwrites ambient hosted InsForge public env", () => {
    const target: Record<string, string | undefined> = {
      NEXT_PUBLIC_INSFORGE_URL: "https://hosted.insforge.app",
      NEXT_PUBLIC_INSFORGE_ANON_KEY: "anon_hosted",
    };
    const applied = overlayLocalInsforgeEnv(
      target,
      "NEXT_PUBLIC_INSFORGE_URL=http://127.0.0.1:7130\nNEXT_PUBLIC_INSFORGE_ANON_KEY=anon_local\n",
    );
    expect(applied).toEqual(["NEXT_PUBLIC_INSFORGE_URL", "NEXT_PUBLIC_INSFORGE_ANON_KEY"]);
    expect(target.NEXT_PUBLIC_INSFORGE_URL).toBe("http://127.0.0.1:7130");
    expect(target.NEXT_PUBLIC_INSFORGE_ANON_KEY).toBe("anon_local");
  });
});
