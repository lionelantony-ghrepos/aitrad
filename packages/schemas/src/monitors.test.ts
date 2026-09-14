import { describe, expect, it } from "vitest";
import {
  compiledMonitorConditionSchema,
  monitorCompileResultSchema,
  monitorRunnerRequestSchema,
  monitorSchema,
  monitorScopeSchema,
} from "./monitors";

describe("monitor DTOs", () => {
  it("parses portfolio scope and a constrained condition row", () => {
    expect(monitorScopeSchema.parse({ kind: "portfolio" }).kind).toBe("portfolio");
    expect(
      compiledMonitorConditionSchema.parse({
        id: "monitor",
        priority: 1,
        conditions: [{ input: "position_day_pct", op: "lte", value: -5 }],
        outputs: { decision: "fire" },
      }).conditions[0]?.input,
    ).toBe("position_day_pct");
    expect(() =>
      compiledMonitorConditionSchema.parse({
        id: "monitor",
        priority: 1,
        conditions: [{ input: "order_notional", op: "gt", value: 1 }],
        outputs: { decision: "fire" },
      }),
    ).toThrow();
    expect(
      monitorRunnerRequestSchema.parse({ force_position_day_pct: -6 }).force_position_day_pct,
    ).toBe(-6);
    const row = monitorSchema.parse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      user_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      session_id: null,
      name: "Drop",
      nl_instruction: "tell me if any position drops 5% in a day",
      compiled_condition: {
        id: "monitor",
        priority: 1,
        conditions: [{ input: "position_day_pct", op: "lte", value: -5 }],
        outputs: { decision: "fire" },
      },
      scope: { kind: "portfolio" },
      cadence: "5m",
      last_run: null,
      active: true,
      throttle_state: {},
      propose_action: null,
      created_at: "2026-09-14T00:00:00.000Z",
      updated_at: "2026-09-14T00:00:00.000Z",
    });
    expect(row.scope.kind).toBe("portfolio");
    expect(
      monitorCompileResultSchema.parse({
        scope: { kind: "symbols", symbols: ["AAPL"] },
        compiled_condition: row.compiled_condition,
      }).scope.kind,
    ).toBe("symbols");
  });
});
