import { describe, expect, it } from "vitest";
import { baselineTable } from "./baseline-tables";
import { evaluate } from "./evaluate";

const CLOCK = new Date("2026-09-11T12:00:00.000Z");

describe("DT-AI-01 seeded copilot action policy", () => {
  const table = baselineTable("DT-AI-01");

  it("defaults to require_approval and never auto-approves propose_order", () => {
    expect(table.default_outputs).toEqual({ decision: "require_approval" });
    const propose = evaluate(table, { tool: "propose_order" }, CLOCK);
    expect(propose.outcome).toMatchObject({ decision: "require_approval" });
    expect(propose.outcome).not.toMatchObject({ decision: "auto_approve" });
  });

  it("auto-approves watchlist/alert tools when under the daily action row", () => {
    const result = evaluate(table, { tool: "create_watchlist_item", actions_today: 0 }, CLOCK);
    expect(result.outcome).toMatchObject({ decision: "auto_approve" });
  });
});
