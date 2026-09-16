import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  EXPECTED_DEMO_POSITIONS,
  EXPECTED_DEMO_USERS,
  EXPECTED_DEMO_WATCHLISTS,
} from "@meridian/schemas";
import { parseDemoUsersJson, traderPortfolio } from "./demo-users";

const fixturePath = path.join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../mock_data/demo-users.json",
);

describe("demo users fixture @TC-031-02", () => {
  it("loads four demo personas and the trader book", () => {
    const fixture = parseDemoUsersJson(JSON.parse(readFileSync(fixturePath, "utf8")) as unknown);
    expect(fixture.users).toHaveLength(EXPECTED_DEMO_USERS);
    expect(new Set(fixture.users.map((row) => row.role))).toEqual(
      new Set(["trader", "admin", "compliance"]),
    );
    const { trader, portfolio } = traderPortfolio(fixture);
    expect(trader.email).toBe("demo.trader@meridian.test");
    expect(portfolio.positions).toHaveLength(EXPECTED_DEMO_POSITIONS);
    expect(Object.keys(portfolio.watchlists)).toHaveLength(EXPECTED_DEMO_WATCHLISTS);
  });

  it("rejects duplicate emails", () => {
    expect(() =>
      parseDemoUsersJson({
        users: [
          {
            email: "dup@meridian.test",
            password: "x",
            role: "trader",
            display_name: "A",
            experience_level: "novice",
            objectives: "learn",
          },
          {
            email: "dup@meridian.test",
            password: "x",
            role: "admin",
            display_name: "B",
            experience_level: "advanced",
          },
        ],
        portfolios: {},
      }),
    ).toThrow(/DUPLICATE_DEMO_EMAIL/);
  });
});
