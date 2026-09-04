import { describe, expect, it } from "vitest";
import { commandRecentsV1Schema } from "./command-recents";

describe("commandRecentsV1Schema", () => {
  it("accepts a version-1 recents list", () => {
    expect(
      commandRecentsV1Schema.parse({ version: 1, items: ["GIP MSFT", "AI hello"] }).items,
    ).toEqual(["GIP MSFT", "AI hello"]);
  });

  it("rejects a missing version", () => {
    expect(commandRecentsV1Schema.safeParse({ items: [] }).success).toBe(false);
  });
});
