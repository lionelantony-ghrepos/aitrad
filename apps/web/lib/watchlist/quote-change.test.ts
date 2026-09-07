import { describe, expect, it } from "vitest";
import { netChange, pctChange } from "./quote-change";

describe("quote change display math", () => {
  it("computes net and percent vs prev_close", () => {
    expect(netChange(210, 200)).toBe(10);
    expect(pctChange(210, 200)).toBe(5);
    expect(pctChange(200, 0)).toBeNull();
  });
});
