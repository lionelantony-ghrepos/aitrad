import { describe, expect, it } from "vitest";
import { orderDraftSchema, orderPreviewResponseSchema } from "./orders";

describe("orderDraftSchema", () => {
  it("accepts a market DAY draft", () => {
    const parsed = orderDraftSchema.parse({
      symbol: "AAPL",
      side: "buy",
      qty: 5,
      order_type: "market",
      tif: "DAY",
    });
    expect(parsed.qty).toBe(5);
  });

  it("rejects unknown fields and invalid enums", () => {
    expect(
      orderDraftSchema.safeParse({
        symbol: "AAPL",
        side: "buy",
        qty: 1,
        order_type: "market",
        tif: "DAY",
        extra: true,
      }).success,
    ).toBe(false);
    expect(
      orderDraftSchema.safeParse({
        symbol: "AAPL",
        side: "hold",
        qty: 1,
        order_type: "market",
        tif: "DAY",
      }).success,
    ).toBe(false);
  });
});

describe("orderPreviewResponseSchema", () => {
  it("parses a pass envelope", () => {
    const parsed = orderPreviewResponseSchema.parse({
      passed: true,
      buying_power: "100000",
      last_price: 200,
      qty: 5,
      order_notional: 1000,
      estimated_fees: 0,
      est_total: 1000,
      fees: { commission_usd: 0, sec_fee: 0, taf: 0 },
      rules: [{ table_key: "DT-RISK-01", passed: true, decision: "allow", reason: "allow" }],
      validation_outcome: { decision: "valid" },
      risk_outcome: { decision: "allow" },
      fee_outcome: { commission_usd: 0 },
    });
    expect(parsed.buying_power).toBe(100000);
  });
});
