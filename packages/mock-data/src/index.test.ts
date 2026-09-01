import { describe, expect, it } from "vitest";
import { generatorsReady, packageName } from "./index";

describe("@meridian/mock-data", () => {
  it("exports the package name", () => {
    expect(packageName).toBe("@meridian/mock-data");
  });

  it("reports generators as ready to implement", () => {
    expect(generatorsReady()).toBe(true);
  });
});
