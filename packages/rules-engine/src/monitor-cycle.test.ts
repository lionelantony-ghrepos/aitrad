import { describe, expect, it } from "vitest";
import { baselineTable } from "./baseline-tables";
import { evaluateDomain, type EvaluateDomainPorts } from "./evaluate-domain";
import { runMonitorCycle, type MonitorSnapshot } from "./monitor-cycle";

const CLOCK = new Date("2026-09-14T14:00:00.000Z");
const USER = "33333333-3333-4333-8333-333333333333";

function alertingPorts(): EvaluateDomainPorts {
  return {
    async loadPublishedTables(domain) {
      if (domain !== "alerting") {
        return [];
      }
      return [
        {
          domain: "alerting",
          tableKey: "DT-ALRT-01",
          version: 1,
          table: baselineTable("DT-ALRT-01"),
        },
      ];
    },
    async writeRuleAudit() {
      return { id: "audit-monitor" };
    },
  };
}

function dropMonitor(active: boolean): MonitorSnapshot {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    user_id: USER,
    name: "Position day drop 5%",
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
    active,
    throttle_state: {},
    propose_action: null,
  };
}

describe("runMonitorCycle @TC-027-02 @TC-027-03", () => {
  it("fires once when test-mode forces -6% then throttles the second pass", async () => {
    const monitor = dropMonitor(true);
    const state = { current: monitor };
    const evaluateAlerting = async (context: Record<string, unknown>, clock: Date) => {
      const result = await evaluateDomain("alerting", context, alertingPorts(), { clock });
      return { outcome: result.outcome };
    };
    const first = await runMonitorCycle({
      monitors: [state.current],
      factsFor: () => ({ position_day_pct: -6, portfolio_day_pct: -3, cited: ["position:AAPL"] }),
      clock: CLOCK,
      userAlertsToday: new Map([[USER, 0]]),
      evaluateAlerting,
      ignoreCadence: true,
    });
    expect(first.fires).toHaveLength(1);
    expect(first.fires[0]?.payload.position_day_pct).toBe(-6);
    expect(String(first.fires[0]?.payload.nl_instruction)).toMatch(/drops 5%/);
    const updated = first.updates[0];
    if (!updated) {
      throw new Error("missing update");
    }
    state.current = {
      ...state.current,
      last_run: updated.last_run,
      throttle_state: updated.throttle_state,
      active: updated.active,
    };
    const second = await runMonitorCycle({
      monitors: [state.current],
      factsFor: () => ({ position_day_pct: -6, portfolio_day_pct: -3 }),
      clock: new Date(CLOCK.getTime() + 60_000),
      userAlertsToday: new Map([[USER, 1]]),
      evaluateAlerting,
      ignoreCadence: true,
    });
    expect(second.fires).toHaveLength(0);
    expect(second.suppressed).toBe(1);
  });

  it("does not fire a paused monitor at -6%", async () => {
    const result = await runMonitorCycle({
      monitors: [dropMonitor(false)],
      factsFor: () => ({ position_day_pct: -6 }),
      clock: CLOCK,
      userAlertsToday: new Map([[USER, 0]]),
      evaluateAlerting: async () => ({ outcome: { decision: "deliver" } }),
      ignoreCadence: true,
    });
    expect(result.fires).toHaveLength(0);
    expect(result.updates).toHaveLength(0);
  });
});
