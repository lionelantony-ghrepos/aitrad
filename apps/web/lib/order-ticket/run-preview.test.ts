import { lastPriceForRuleFacts } from "@meridian/paper-engine";
import { createRulesAdminMemory } from "@meridian/rules-engine";
import type { Account, Instrument, OrderDraft, Profile } from "@meridian/schemas";
import { describe, expect, it } from "vitest";
import { runLocalOrderPreview } from "./run-preview";

const account: Account = {
  id: "22222222-2222-4222-8222-222222222222",
  user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  cash_balance: 100_000,
  currency: "USD",
  created_at: "2026-09-08T00:00:00.000Z",
  updated_at: "2026-09-08T00:00:00.000Z",
};

const profile: Profile = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: account.user_id,
  display_name: "Ada",
  persona: "trader",
  experience_level: "intermediate",
  suitability_tier: "standard",
  objectives: null,
  created_at: account.created_at,
  updated_at: account.updated_at,
};

const instrument: Instrument = {
  id: "33333333-3333-4333-8333-333333333333",
  symbol: "AAPL",
  name: "Apple",
  exchange: "NASDAQ",
  sector: "Technology",
  industry: "Consumer Electronics",
  status: "active",
  currency: "USD",
  tick_size: 0.01,
  lot_size: 1,
  created_at: account.created_at,
  updated_at: account.updated_at,
};

const baseDraft: OrderDraft = {
  symbol: "AAPL",
  side: "buy",
  qty: 5,
  order_type: "market",
  tif: "DAY",
};

describe("TC-013-01 local preview risk reason (AC-013-01)", () => {
  it("oversized qty renders DT-RISK-01 reason then a smaller qty passes", async () => {
    const memory = createRulesAdminMemory();
    const rejected = await runLocalOrderPreview({
      draft: { ...baseDraft, qty: 300 },
      lastPrice: 200,
      account,
      profile,
      instrument,
      memory,
    });
    expect(rejected.passed).toBe(false);
    const risk = rejected.rules.find((row) => row.table_key === "DT-RISK-01");
    expect(risk?.reason).toBe("RISK_MAX_NOTIONAL");

    const ok = await runLocalOrderPreview({
      draft: { ...baseDraft, qty: 5 },
      lastPrice: 200,
      account,
      profile,
      instrument,
      memory,
    });
    expect(ok.passed).toBe(true);
    expect(ok.est_total).toBe(1000);
  });

  it("spoofed low client last does not understate notional for risk", async () => {
    const memory = createRulesAdminMemory();
    const last = lastPriceForRuleFacts({ quoteLast: 200, clientLast: 1 });
    const preview = await runLocalOrderPreview({
      draft: { ...baseDraft, qty: 300 },
      lastPrice: last,
      account,
      profile,
      instrument,
      memory,
    });
    expect(preview.last_price).toBe(200);
    expect(preview.order_notional).toBe(60_000);
    expect(preview.passed).toBe(false);
    const risk = preview.rules.find((row) => row.table_key === "DT-RISK-01");
    expect(risk?.passed).toBe(false);
    expect(risk?.reason).toBe("RISK_MAX_NOTIONAL");
  });
});
