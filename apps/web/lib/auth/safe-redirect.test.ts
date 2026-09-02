import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./safe-redirect";

describe("safeInternalPath", () => {
  it("allows same-origin paths only", () => {
    expect(safeInternalPath("/onboarding")).toBe("/onboarding");
    expect(safeInternalPath("https://evil.example/x")).toBe("/workspace");
    expect(safeInternalPath("//evil.example")).toBe("/workspace");
    expect(safeInternalPath(null)).toBe("/workspace");
  });
});
