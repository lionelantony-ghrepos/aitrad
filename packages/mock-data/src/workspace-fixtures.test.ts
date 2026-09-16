import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseWorkspaceFixturesJson } from "./workspace-fixtures";

const fixturePath = path.join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../mock_data/workspace-fixtures.json",
);

describe("workspace demo fixtures", () => {
  it("covers screener, alerts, blotter, monitors, briefs, and copilot", () => {
    const fixture = parseWorkspaceFixturesJson(
      JSON.parse(readFileSync(fixturePath, "utf8")) as unknown,
    );
    expect(fixture.screens.map((row) => row.name)).toEqual([
      "Mega Cap Mosaic",
      "Income & Yield",
      "Oversold RSI",
      "Tech Tape",
    ]);
    expect(fixture.alert_rules).toHaveLength(3);
    expect(fixture.working_orders.some((row) => row.status === "working")).toBe(true);
    expect(fixture.bracket.symbol).toBe("AVGO");
    expect(fixture.monitors).toHaveLength(2);
    expect(fixture.briefs.map((row) => row.kind).sort()).toEqual([
      "instrument",
      "morning",
      "portfolio",
    ]);
    expect(fixture.copilot.action.tool).toBe("propose_order");
  });
});
