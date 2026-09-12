import type { AlertThrottleState, DecisionRow } from "@meridian/schemas";
import { evaluate, type EvaluationContext } from "./evaluate";

export type AlertMarketContext = {
  instrument_id: string;
  symbol?: string;
  last: number;
  prev_close: number;
  volume: number;
  rsi_14: number | null;
  news_sentiment: number | null;
};

export type AlertRuleSnapshot = {
  id: string;
  user_id: string;
  instrument_id: string | null;
  name: string;
  condition: DecisionRow;
  active: boolean;
  throttle_state: AlertThrottleState;
};

export type AlertFireDraft = {
  user_id: string;
  alert_rule_id: string;
  instrument_id: string | null;
  message: string;
  payload: Record<string, unknown>;
};

export type AlertRuleUpdate = {
  id: string;
  active: boolean;
  throttle_state: AlertThrottleState;
};

export type AlertingOutcome = {
  outcome: Record<string, unknown> | Array<Record<string, unknown>>;
};

export type EvaluateAlerting = (
  context: EvaluationContext,
  clock: Date,
  meta: { userId: string; ruleId: string },
) => Promise<AlertingOutcome>;

export function utcDay(clock: Date): string {
  return clock.toISOString().slice(0, 10);
}

export function minutesSince(iso: string | null | undefined, clock: Date): number | undefined {
  if (!iso) {
    return undefined;
  }
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) {
    return undefined;
  }
  return (clock.getTime() - then) / 60_000;
}

export function buildAlertMarketFacts(
  market: AlertMarketContext,
  prevLast: number | null | undefined,
): EvaluationContext {
  const prevClose = market.prev_close;
  const pctChg = prevClose === 0 ? null : ((market.last - prevClose) / prevClose) * 100;
  return {
    last: market.last,
    prev_last: prevLast ?? market.last,
    prev_close: market.prev_close,
    pct_chg: pctChg,
    volume: market.volume,
    rsi_14: market.rsi_14,
    news_sentiment: market.news_sentiment,
  };
}

export function buildAlertThrottleFacts(input: {
  lastFiredAt: string | null | undefined;
  ruleFiresToday: number;
  userAlertsToday: number;
  clock: Date;
}): EvaluationContext {
  const elapsed = minutesSince(input.lastFiredAt, input.clock);
  const facts: EvaluationContext = {
    rule_fires_today: input.ruleFiresToday,
    user_alerts_today: input.userAlertsToday,
  };
  if (elapsed !== undefined) {
    facts.same_rule_fired_within_min = elapsed;
  }
  return facts;
}

export function alertingDecisionFromOutcome(
  outcome: AlertingOutcome["outcome"],
): "deliver" | "suppress" | "suppress_and_pause_rule" {
  const row = Array.isArray(outcome) ? outcome[0] : outcome;
  const decision = row && typeof row === "object" ? row.decision : undefined;
  if (decision === "suppress" || decision === "suppress_and_pause_rule" || decision === "deliver") {
    return decision;
  }
  return "suppress";
}

export function alertConditionMatched(
  condition: DecisionRow,
  context: EvaluationContext,
  clock: Date,
): boolean {
  const result = evaluate(
    {
      id: "alert-rule",
      hit_policy: "FIRST",
      default_outputs: { decision: "idle" },
      rows: [condition],
    },
    context,
    clock,
  );
  const outcome = result.outcome;
  const decision =
    outcome && typeof outcome === "object" && !Array.isArray(outcome)
      ? outcome.decision
      : undefined;
  return result.matchedRows.length > 0 && decision === "fire";
}

function firesTodayFor(state: AlertThrottleState, clock: Date): number {
  const day = utcDay(clock);
  if (state.fires_on_date !== day) {
    return 0;
  }
  return state.fires_today ?? 0;
}

function withLastEval(state: AlertThrottleState, last: number): AlertThrottleState {
  return { ...state, last_eval_last: last };
}

export async function runAlertCycle(input: {
  rules: AlertRuleSnapshot[];
  markets: AlertMarketContext[];
  clock: Date;
  userAlertsToday: Map<string, number>;
  evaluateAlerting: EvaluateAlerting;
}): Promise<{ fires: AlertFireDraft[]; ruleUpdates: AlertRuleUpdate[]; suppressed: number }> {
  const fires: AlertFireDraft[] = [];
  const ruleUpdates: AlertRuleUpdate[] = [];
  let suppressed = 0;
  const marketById = new Map(input.markets.map((row) => [row.instrument_id, row]));
  const todayCounts = new Map(input.userAlertsToday);

  for (const rule of input.rules) {
    if (!rule.active || rule.throttle_state.paused === true) {
      continue;
    }
    const targets: AlertMarketContext[] = [];
    if (rule.instrument_id === null) {
      targets.push(...input.markets);
    } else {
      const found = marketById.get(rule.instrument_id);
      if (found) {
        targets.push(found);
      }
    }
    if (targets.length === 0) {
      continue;
    }

    let nextState: AlertThrottleState = { ...rule.throttle_state };
    let nextActive: boolean = rule.active;
    let changed = false;

    for (const market of targets) {
      const facts = buildAlertMarketFacts(market, nextState.last_eval_last ?? null);
      const matched = alertConditionMatched(rule.condition, facts, input.clock);
      nextState = withLastEval(nextState, market.last);
      changed = true;
      if (!matched) {
        continue;
      }
      const userId = rule.user_id;
      const throttleFacts = buildAlertThrottleFacts({
        lastFiredAt: nextState.last_fired_at,
        ruleFiresToday: firesTodayFor(nextState, input.clock),
        userAlertsToday: todayCounts.get(userId) ?? 0,
        clock: input.clock,
      });
      const alerting = await input.evaluateAlerting(throttleFacts, input.clock, {
        userId,
        ruleId: rule.id,
      });
      const decision = alertingDecisionFromOutcome(alerting.outcome);
      if (decision === "suppress") {
        suppressed += 1;
        continue;
      }
      if (decision === "suppress_and_pause_rule") {
        suppressed += 1;
        nextActive = false;
        nextState = { ...nextState, paused: true };
        break;
      }
      const day = utcDay(input.clock);
      const prior = firesTodayFor(nextState, input.clock);
      nextState = {
        ...nextState,
        last_fired_at: input.clock.toISOString(),
        fires_today: prior + 1,
        fires_on_date: day,
        paused: false,
      };
      todayCounts.set(userId, (todayCounts.get(userId) ?? 0) + 1);
      fires.push({
        user_id: userId,
        alert_rule_id: rule.id,
        instrument_id: market.instrument_id,
        message: rule.name,
        payload: {
          symbol: market.symbol,
          last: market.last,
          pct_chg: facts.pct_chg,
          rsi_14: market.rsi_14,
          news_sentiment: market.news_sentiment,
        },
      });
    }

    if (changed) {
      ruleUpdates.push({ id: rule.id, active: nextActive, throttle_state: nextState });
    }
  }

  return { fires, ruleUpdates, suppressed };
}
