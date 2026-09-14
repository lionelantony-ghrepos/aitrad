import { describe, expect, it } from "vitest";
import { briefGenerateRequestSchema, briefKindSchema } from "./briefs";

describe("brief schemas", () => {
  it("parses generate kinds", () => {
    expect(briefKindSchema.parse("morning")).toBe("morning");
    expect(briefGenerateRequestSchema.parse({ kind: "portfolio" }).kind).toBe("portfolio");
    expect(briefGenerateRequestSchema.safeParse({ kind: "other" }).success).toBe(false);
  });
});
