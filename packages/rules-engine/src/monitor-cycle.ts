import type {
  AlertThrottleState,
  CompiledMonitorCondition,
  DecisionRow,
  Monitor,
} from "@meridian/schemas";
import {
  alertConditionMatched,
  alertingDecisionFromOutcome,
  buildAlertThrottleFacts,
  utcDay,
  type AlertingOutcome,
  type EvaluateAlerting,
} from "./alert-cycle";
import type { EvaluationContext } from "./evaluate";

export type MonitorFacts = EvaluationContext & {
  symbol?: string;
  sector?: string;
  cited?: string[];
};

export type MonitorSnapshot = Pick<
  Monitor,
  | "id"
  | "user_id"
  | "name"
  | "nl_instruction"
  | "compiled_condition"
  | "scope"
  | "cadence"
  | "last_run"
  | "active"
  | "throttle_state"
  | "propose_action"
>;

export type MonitorFireDraft = {
  user_id: string;
  monitor_id: string;
  instrument_id: string | null;
  message: string;
  payload: Record<string, unknown>;
  facts: MonitorFacts;
  propose_action: Record<string, unknown> | null;
};

export type MonitorRuleUpdate = {
  id: string;
  active: boolean;
  last_run: string;
  throttle_state: AlertThrottleState;
};

const CADENCE_MS: Record<string, number> = {
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

export function cadenceElapsed(
  cadence: string,
  lastRun: string | null | undefined,
  clock: Date,
): boolean {
  if (!lastRun) {
    return true;
  }
  const then = Date.parse(lastRun);
  if (!Number.isFinite(then)) {
    return true;
  }
  const windowMs = CADENCE_MS[cadence] ?? CADENCE_MS["5m"];
  return clock.getTime() - then >= (windowMs ?? 0);
}

function firesTodayFor(state: AlertThrottleState, clock: Date): number {
  const day = utcDay(clock);
  if (state.fires_on_date !== day) {
    return 0;
  }
  return state.fires_today ?? 0;
}

export async function runMonitorCycle(input: {
  monitors: MonitorSnapshot[];
  factsFor: (monitor: MonitorSnapshot) => MonitorFacts | null;
  clock: Date;
  userAlertsToday: Map<string, number>;
  evaluateAlerting: EvaluateAlerting;
  ignoreCadence?: boolean;
}): Promise<{ fires: MonitorFireDraft[]; updates: MonitorRuleUpdate[]; suppressed: number }> {
  const fires: MonitorFireDraft[] = [];
  const updates: MonitorRuleUpdate[] = [];
  let suppressed = 0;
  const todayCounts = new Map(input.userAlertsToday);

  for (const monitor of input.monitors) {
    if (!monitor.active || monitor.throttle_state.paused === true) {
      continue;
    }
    if (!input.ignoreCadence && !cadenceElapsed(monitor.cadence, monitor.last_run, input.clock)) {
      continue;
    }
    const facts = input.factsFor(monitor);
    const lastRun = input.clock.toISOString();
    if (!facts) {
      updates.push({
        id: monitor.id,
        active: monitor.active,
        last_run: lastRun,
        throttle_state: monitor.throttle_state,
      });
      continue;
    }
    const condition: DecisionRow = monitor.compiled_condition as CompiledMonitorCondition;
    const matched = alertConditionMatched(condition, facts, input.clock);
    let nextState: AlertThrottleState = { ...monitor.throttle_state };
    let nextActive: boolean = monitor.active;
    if (!matched) {
      updates.push({
        id: monitor.id,
        active: nextActive,
        last_run: lastRun,
        throttle_state: nextState,
      });
      continue;
    }
    const throttleFacts = buildAlertThrottleFacts({
      lastFiredAt: nextState.last_fired_at,
      ruleFiresToday: firesTodayFor(nextState, input.clock),
      userAlertsToday: todayCounts.get(monitor.user_id) ?? 0,
      clock: input.clock,
    });
    const alerting: AlertingOutcome = await input.evaluateAlerting(throttleFacts, input.clock, {
      userId: monitor.user_id,
      ruleId: monitor.id,
    });
    const decision = alertingDecisionFromOutcome(alerting.outcome);
    if (decision === "suppress") {
      suppressed += 1;
      updates.push({
        id: monitor.id,
        active: nextActive,
        last_run: lastRun,
        throttle_state: nextState,
      });
      continue;
    }
    if (decision === "suppress_and_pause_rule") {
      suppressed += 1;
      nextActive = false;
      nextState = { ...nextState, paused: true };
      updates.push({
        id: monitor.id,
        active: nextActive,
        last_run: lastRun,
        throttle_state: nextState,
      });
      continue;
    }
    const day = utcDay(input.clock);
    const prior = firesTodayFor(nextState, input.clock);
    nextState = {
      ...nextState,
      last_fired_at: lastRun,
      fires_today: prior + 1,
      fires_on_date: day,
      paused: false,
    };
    todayCounts.set(monitor.user_id, (todayCounts.get(monitor.user_id) ?? 0) + 1);
    const propose =
      monitor.propose_action && typeof monitor.propose_action === "object"
        ? monitor.propose_action
        : null;
    fires.push({
      user_id: monitor.user_id,
      monitor_id: monitor.id,
      instrument_id: null,
      message: monitor.name,
      payload: {
        ...facts,
        nl_instruction: monitor.nl_instruction,
      },
      facts,
      propose_action: propose,
    });
    updates.push({
      id: monitor.id,
      active: nextActive,
      last_run: lastRun,
      throttle_state: nextState,
    });
  }

  return { fires, updates, suppressed };
}
