import { describe, expect, it } from "vitest";
import {
  EXPECTED_DEMO_POSITIONS,
  EXPECTED_DEMO_USERS,
  EXPECTED_DEMO_WATCHLISTS,
  EXPECTED_PUBLISHED_TABLES,
  RELEASE_RUNBOOK_STEPS,
  SEED_ALL_STEPS,
  demoUsersFixtureSchema,
  fullSeedCountsSchema,
  releaseRunbookStepSchema,
  seedAllStepSchema,
} from "./demo-seed";

describe("seed-all contracts @TC-031-02", () => {
  it("keeps docs/06 pipeline order through verify", () => {
    expect(SEED_ALL_STEPS).toEqual([
      "instruments",
      "market_calendar",
      "bars",
      "quotes_latest",
      "rules",
      "fundamentals",
      "news",
      "demo_users",
      "demo_portfolio",
      "watchlists",
      "feed_test_mode",
      "verify",
    ]);
    expect(seedAllStepSchema.options).toEqual([...SEED_ALL_STEPS]);
  });

  it("keeps RELEASE.md migrate → seed → verify → e2e → tag order", () => {
    expect(RELEASE_RUNBOOK_STEPS).toEqual(["migrate", "seed", "verify_audit_chain", "e2e", "tag"]);
    expect(releaseRunbookStepSchema.parse("verify_audit_chain")).toBe("verify_audit_chain");
  });

  it("parses demo-users fixture shape", () => {
    const fixture = demoUsersFixtureSchema.parse({
      users: [
        {
          email: "demo.trader@meridian.test",
          password: "x",
          role: "trader",
          display_name: "Dana",
          experience_level: "intermediate",
          objectives: "paper trade",
        },
      ],
      portfolios: {
        "demo.trader@meridian.test": {
          cash: 1,
          positions: [{ symbol: "AAPL", qty: 1, avg_cost: 1 }],
          watchlists: { Core: ["AAPL"] },
        },
      },
    });
    expect(fixture.users[0]?.role).toBe("trader");
    expect(
      fullSeedCountsSchema.parse({
        instruments: 150,
        dailyBars: 1,
        minuteBars: 1,
        quotes: 150,
        publishedTables: EXPECTED_PUBLISHED_TABLES,
        newsItems: 500,
        newsEmbeddings: 500,
        fundamentals: 150,
        users: EXPECTED_DEMO_USERS,
        demoPositions: EXPECTED_DEMO_POSITIONS,
        watchlists: EXPECTED_DEMO_WATCHLISTS,
      }).users,
    ).toBe(4);
  });
});
