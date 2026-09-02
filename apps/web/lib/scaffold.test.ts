import { describe, expect, it } from "vitest";
import { scaffoldStatus } from "./scaffold";

describe("web scaffold", () => {
  it("reports scaffold ready", () => {
    expect(scaffoldStatus()).toBe("Scaffold ready (@meridian/schemas)");
  });
});
