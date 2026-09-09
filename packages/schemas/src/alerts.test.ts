import { describe, expect, it } from "vitest";
import {
  alertCreateRequestSchema,
  alertKindSchema,
  alertRuleSchema,
  alertRunnerRequestSchema,
  alertThrottleStateSchema,
} from "./alerts";

describe("alert DTOs", () => {
  it("parses kinds, throttle state, and a rules-engine condition row", () => {
    expect(alertKindSchema.parse("price_cross_above")).toBe("price_cross_above");
    expect(alertThrottleStateSchema.parse({ last_eval_last: "189.6" }).last_eval_last).toBe(189.6);
    const row = alertRuleSchema.parse({
      id: "22222222-2222-4222-8222-222222222222",
      user_id: "33333333-3333-4333-8333-333333333333",
      instrument_id: "11111111-1111-4111-8111-111111111111",
      name: "AAPL above 200",
      kind: "price_cross_above",
      condition: {
        id: "alert",
        priority: 1,
        conditions: [{ input: "last", op: "gt", value: 200 }],
        outputs: { decision: "fire" },
      },
      active: true,
      throttle_state: {},
      created_at: "2026-09-09T00:00:00.000Z",
      updated_at: "2026-09-09T00:00:00.000Z",
    });
    expect(row.condition.conditions[0]?.op).toBe("gt");
    expect(alertCreateRequestSchema.parse({ kind: "rsi", threshold: 30 }).threshold).toBe(30);
    expect(alertRunnerRequestSchema.parse({ ticks: [] }).news).toBeUndefined();
  });
});
