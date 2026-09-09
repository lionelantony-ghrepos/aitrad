import { describe, expect, it } from "vitest";
import {
  alertConditionMatched,
  alertingDecisionFromOutcome,
  buildAlertThrottleFacts,
  runAlertCycle,
} from "./alert-cycle";
import { compileAlertTemplate } from "./alert-templates";
import { baselineTable } from "./baseline-tables";
import { evaluateDomain, type EvaluateDomainPorts } from "./evaluate-domain";

const CLOCK = new Date("2026-09-09T14:00:00.000Z");
const USER = "33333333-3333-4333-8333-333333333333";
const AAPL = "11111111-1111-4111-8111-111111111111";

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
      return { id: "audit-alert" };
    },
  };
}

describe("alert templates and condition eval", () => {
  it("fires a price-cross when last moves through the user threshold", () => {
    const condition = compileAlertTemplate({ kind: "price_cross_above", threshold: 200 });
    expect(
      alertConditionMatched(
        condition,
        { last: 201, prev_last: 189.6, pct_chg: 8, volume: 1, rsi_14: 55, news_sentiment: null },
        CLOCK,
      ),
    ).toBe(true);
    expect(
      alertConditionMatched(
        condition,
        { last: 201, prev_last: 200.5, pct_chg: 8, volume: 1, rsi_14: 55, news_sentiment: null },
        CLOCK,
      ),
    ).toBe(false);
  });

  it("matches %chg, RSI, volume, and negative-news templates", () => {
    expect(
      alertConditionMatched(
        compileAlertTemplate({ kind: "pct_chg", threshold: 2 }),
        { last: 110, prev_last: 100, pct_chg: 5, volume: 1, rsi_14: 50, news_sentiment: 0 },
        CLOCK,
      ),
    ).toBe(true);
    expect(
      alertConditionMatched(
        compileAlertTemplate({ kind: "rsi", threshold: 30 }),
        { last: 10, prev_last: 10, pct_chg: 0, volume: 1, rsi_14: 22, news_sentiment: 0 },
        CLOCK,
      ),
    ).toBe(true);
    expect(
      alertConditionMatched(
        compileAlertTemplate({ kind: "volume", threshold: 1_000_000 }),
        { last: 10, prev_last: 10, pct_chg: 0, volume: 2_000_000, rsi_14: 50, news_sentiment: 0 },
        CLOCK,
      ),
    ).toBe(true);
    expect(
      alertConditionMatched(
        compileAlertTemplate({ kind: "news_sentiment" }),
        { last: 10, prev_last: 10, pct_chg: 0, volume: 1, rsi_14: 50, news_sentiment: -0.4 },
        CLOCK,
      ),
    ).toBe(true);
  });
});

describe("DT-ALRT-01 throttle facts", () => {
  it("omits same_rule_fired_within_min until a prior fire exists", () => {
    const first = buildAlertThrottleFacts({
      lastFiredAt: undefined,
      ruleFiresToday: 0,
      userAlertsToday: 0,
      clock: CLOCK,
    });
    expect(first.same_rule_fired_within_min).toBeUndefined();
    const again = buildAlertThrottleFacts({
      lastFiredAt: CLOCK.toISOString(),
      ruleFiresToday: 1,
      userAlertsToday: 1,
      clock: CLOCK,
    });
    expect(again.same_rule_fired_within_min).toBe(0);
  });

  it("maps alerting outcomes without embedding table thresholds", () => {
    expect(alertingDecisionFromOutcome({ decision: "deliver" })).toBe("deliver");
    expect(alertingDecisionFromOutcome({ decision: "suppress" })).toBe("suppress");
    expect(alertingDecisionFromOutcome({ decision: "suppress_and_pause_rule" })).toBe(
      "suppress_and_pause_rule",
    );
  });
});

describe("runAlertCycle @TC-022", () => {
  it("delivers a price-cross once then suppresses a recross in the same minute", async () => {
    const condition = compileAlertTemplate({ kind: "price_cross_above", threshold: 200 });
    const ports = alertingPorts();
    const evaluateAlerting = async (context: Record<string, unknown>, clock: Date) => {
      const result = await evaluateDomain("alerting", context, ports, { clock });
      return { outcome: result.outcome };
    };

    const first = await runAlertCycle({
      rules: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          user_id: USER,
          instrument_id: AAPL,
          name: "AAPL above 200",
          condition,
          active: true,
          throttle_state: { last_eval_last: 189.6 },
        },
      ],
      markets: [
        {
          instrument_id: AAPL,
          symbol: "AAPL",
          last: 201,
          prev_close: 185,
          volume: 1,
          rsi_14: 55,
          news_sentiment: null,
        },
      ],
      clock: CLOCK,
      userAlertsToday: new Map(),
      evaluateAlerting,
    });
    expect(first.fires).toHaveLength(1);
    expect(first.suppressed).toBe(0);

    const recross = await runAlertCycle({
      rules: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          user_id: USER,
          instrument_id: AAPL,
          name: "AAPL above 200",
          condition,
          active: true,
          throttle_state: {
            ...first.ruleUpdates[0]?.throttle_state,
            last_eval_last: 199,
          },
        },
      ],
      markets: [
        {
          instrument_id: AAPL,
          symbol: "AAPL",
          last: 210,
          prev_close: 185,
          volume: 1,
          rsi_14: 55,
          news_sentiment: null,
        },
      ],
      clock: CLOCK,
      userAlertsToday: new Map([[USER, 1]]),
      evaluateAlerting,
    });
    expect(recross.fires).toHaveLength(0);
    expect(recross.suppressed).toBe(1);
  });

  it("skips disabled rules even when the condition matches", async () => {
    const result = await runAlertCycle({
      rules: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          user_id: USER,
          instrument_id: AAPL,
          name: "disabled",
          condition: compileAlertTemplate({ kind: "price_cross_above", threshold: 200 }),
          active: false,
          throttle_state: { last_eval_last: 189.6 },
        },
      ],
      markets: [
        {
          instrument_id: AAPL,
          symbol: "AAPL",
          last: 201,
          prev_close: 185,
          volume: 1,
          rsi_14: 55,
          news_sentiment: null,
        },
      ],
      clock: CLOCK,
      userAlertsToday: new Map(),
      evaluateAlerting: async () => ({ outcome: { decision: "deliver" } }),
    });
    expect(result.fires).toHaveLength(0);
    expect(result.ruleUpdates).toHaveLength(0);
  });
});
