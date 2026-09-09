import { describe, expect, it } from "vitest";
import { criteriaToDraft, draftToCriteria, emptyDraftCriteria } from "./draft";

describe("screener draft round-trip", () => {
  it("parses the default Technology eq draft", () => {
    const criteria = draftToCriteria(emptyDraftCriteria());
    expect(criteria).toEqual({
      combinator: "and",
      groups: [
        {
          combinator: "and",
          conditions: [{ field: "sector", op: "eq", value: "Technology" }],
        },
      ],
    });
  });

  it("parses numeric lists and round-trips named screens", () => {
    const criteria = {
      combinator: "and" as const,
      groups: [
        {
          combinator: "and" as const,
          conditions: [
            { field: "pe" as const, op: "lt" as const, value: 20 },
            { field: "dividend_yield" as const, op: "gt" as const, value: 1 },
            { field: "market_cap_band" as const, op: "in" as const, value: ["mega", "large"] },
          ],
        },
      ],
    };
    const back = draftToCriteria(criteriaToDraft(criteria));
    expect(back).toEqual(criteria);
  });
});
