import { describe, expect, it } from "vitest";
import { formatPaperCash } from "./format-cash";

describe("formatPaperCash", () => {
  it("uses tabular currency formatting", () => {
    expect(formatPaperCash(2500, "USD")).toBe("$2,500");
  });
});
