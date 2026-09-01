import { describe, expect, it } from "vitest";
import { matcherReady, packageName } from "./index";

describe("@meridian/paper-engine", () => {
  it("exports the package name", () => {
    expect(packageName).toBe("@meridian/paper-engine");
  });

  it("reports the matcher scaffold as ready", () => {
    expect(matcherReady()).toBe(true);
  });
});
