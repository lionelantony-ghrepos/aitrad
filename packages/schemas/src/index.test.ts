import { describe, expect, it } from "vitest";
import {
  chartBarsResponseSchema,
  chartRangeSchema,
  credentialsSchema,
  marketBarSchema,
  marketCalendarRowSchema,
  mockInstrumentSchema,
  packageName,
  profileWizardSchema,
  provisionResultSchema,
  publicInsforgeEnvSchema,
  watchlistItemSchema,
  watchlistSchema,
  workspaceLayoutV1Schema,
} from "./index";

describe("@meridian/schemas", () => {
  it("exports the package name", () => {
    expect(packageName).toBe("@meridian/schemas");
  });

  it("accepts a valid public InsForge env fixture", () => {
    const parsed = publicInsforgeEnvSchema.parse({
      NEXT_PUBLIC_INSFORGE_URL: "https://example.insforge.app",
      NEXT_PUBLIC_INSFORGE_ANON_KEY: "anon-test-key",
    });
    expect(parsed.NEXT_PUBLIC_INSFORGE_ANON_KEY).toBe("anon-test-key");
  });

  it("rejects a missing anon key", () => {
    const result = publicInsforgeEnvSchema.safeParse({
      NEXT_PUBLIC_INSFORGE_URL: "https://example.insforge.app",
    });
    expect(result.success).toBe(false);
  });

  it("parses wizard and credential payloads", () => {
    expect(
      profileWizardSchema.parse({
        display_name: "Ada",
        experience_level: "novice",
        objectives: "learn",
      }).experience_level,
    ).toBe("novice");
    expect(credentialsSchema.safeParse({ email: "bad", password: "x" }).success).toBe(false);
  });

  it("parses a provision result envelope", () => {
    const parsed = provisionResultSchema.parse({
      profile: {
        id: "11111111-1111-4111-8111-111111111111",
        user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        display_name: null,
        persona: null,
        experience_level: null,
        suitability_tier: null,
        objectives: null,
        created_at: "2026-09-02T00:00:00.000Z",
        updated_at: "2026-09-02T00:00:00.000Z",
      },
      account: {
        id: "22222222-2222-4222-8222-222222222222",
        user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        cash_balance: "2500",
        currency: "USD",
        created_at: "2026-09-02T00:00:00.000Z",
        updated_at: "2026-09-02T00:00:00.000Z",
      },
      created: { profile: true, account: true },
    });
    expect(parsed.account.cash_balance).toBe(2500);
  });

  it("parses mock instrument, bar, and quote DTOs", () => {
    const mock = mockInstrumentSchema.parse({
      symbol: "AAPL",
      name: "Apple Inc.",
      exchange: "NASDAQ",
      sector: "Technology",
      industry: "Consumer Electronics",
      status: "active",
      currency: "USD",
      tick_size: 0.01,
      lot_size: 1,
      base_price: 212,
      market_cap_band: "mega",
      beta_class: "medium",
      avg_volume: 1_000,
      avg_volume_band: "high",
    });
    expect(mock.symbol).toBe("AAPL");
    expect(
      marketBarSchema.parse({
        instrument_id: "11111111-1111-4111-8111-111111111111",
        timeframe: "1d",
        ts: "2026-07-02T00:00:00.000Z",
        o: 1,
        h: 2,
        l: 1,
        c: 1.5,
        v: 10,
      }).timeframe,
    ).toBe("1d");
  });

  it("parses a market calendar session row", () => {
    expect(
      marketCalendarRowSchema.parse({
        session_date: "2026-11-27T00:00:00.000Z",
        venue: "NYSE",
        session_kind: "half",
        open_minute: "570",
        close_minute: "780",
      }).session_date,
    ).toBe("2026-11-27");
  });

  it("parses chart range and bars response", () => {
    expect(chartRangeSchema.parse("1D")).toBe("1D");
    const payload = chartBarsResponseSchema.parse({
      symbol: "MSFT",
      instrument_id: "22222222-2222-4222-8222-222222222222",
      range: "1W",
      timeframe: "1d",
      bars: [
        {
          instrument_id: "22222222-2222-4222-8222-222222222222",
          timeframe: "1d",
          ts: "2026-09-04T13:30:00.000Z",
          o: 1,
          h: 2,
          l: 1,
          c: 1.5,
          v: 10,
        },
      ],
    });
    expect(payload.timeframe).toBe("1d");
    expect(payload.bars).toHaveLength(1);
  });

  it("re-exports workspaceLayoutV1Schema from the package barrel", () => {
    const parsed = workspaceLayoutV1Schema.parse({
      version: 1,
      dockview: { grid: {} },
    });
    expect(parsed.version).toBe(1);
  });

  it("parses watchlist and watchlist item rows", () => {
    const list = watchlistSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Core",
      created_at: "2026-09-04T00:00:00.000Z",
      updated_at: "2026-09-04T00:00:00.000Z",
    });
    expect(list.name).toBe("Core");
    expect(
      watchlistItemSchema.parse({
        id: "22222222-2222-4222-8222-222222222222",
        watchlist_id: list.id,
        instrument_id: "33333333-3333-4333-8333-333333333333",
        sort_order: "0",
        created_at: "2026-09-04T00:00:00.000Z",
      }).sort_order,
    ).toBe(0);
  });
});
