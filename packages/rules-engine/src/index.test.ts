import { describe, expect, it } from "vitest";
import { engineReady, evaluateDomain, packageName } from "./index";

describe("@meridian/rules-engine", () => {
  it("exports the package name", () => {
    expect(packageName).toBe("@meridian/rules-engine");
  });

  it("reports the engine scaffold as ready", () => {
    expect(engineReady()).toBe(true);
  });

  it("exports evaluateDomain", () => {
    expect(typeof evaluateDomain).toBe("function");
  });
});
