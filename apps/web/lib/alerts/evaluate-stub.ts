import {
  baselineTable,
  evaluateDomain,
  runAlertCycle,
  utcDay,
  type AlertMarketContext,
} from "@meridian/rules-engine";
import type { AlertInstance, QuoteTick } from "@meridian/schemas";
import {
  STUB_INSTRUMENTS,
  STUB_RSI,
  stubInsertAlert,
  stubListAlertRules,
  stubListAlerts,
  stubPatchAlertRule,
  stubQuoteForInstrument,
} from "@/lib/auth/stub-store";

export async function stubEvaluateAlerts(input: {
  userId: string;
  ticks: QuoteTick[];
  clock?: Date;
}): Promise<AlertInstance[]> {
  const clock = input.clock ?? new Date();
  const rules = stubListAlertRules(input.userId).filter((row) => row.active);
  const tickById = new Map(input.ticks.map((tick) => [tick.instrument_id, tick]));
  const markets: AlertMarketContext[] = [];
  const seen = new Set<string>();
  for (const tick of input.ticks) {
    seen.add(tick.instrument_id);
    markets.push({
      instrument_id: tick.instrument_id,
      symbol: tick.symbol ?? STUB_INSTRUMENTS.find((row) => row.id === tick.instrument_id)?.symbol,
      last: tick.last,
      prev_close: tick.prev_close,
      volume: tick.volume,
      rsi_14: STUB_RSI[tick.instrument_id] ?? null,
      news_sentiment: null,
    });
  }
  for (const rule of rules) {
    if (!rule.instrument_id || seen.has(rule.instrument_id)) {
      continue;
    }
    const quote = stubQuoteForInstrument(rule.instrument_id);
    const tick = tickById.get(rule.instrument_id);
    if (!quote && !tick) {
      continue;
    }
    seen.add(rule.instrument_id);
    markets.push({
      instrument_id: rule.instrument_id,
      symbol: STUB_INSTRUMENTS.find((row) => row.id === rule.instrument_id)?.symbol,
      last: tick?.last ?? quote?.last ?? 0,
      prev_close: tick?.prev_close ?? quote?.prev_close ?? 0,
      volume: tick?.volume ?? quote?.volume ?? 0,
      rsi_14: STUB_RSI[rule.instrument_id] ?? null,
      news_sentiment: null,
    });
  }

  const day = utcDay(clock);
  const userAlertsToday = stubListAlerts(input.userId).filter((row) =>
    row.fired_at.startsWith(day),
  ).length;

  const cycle = await runAlertCycle({
    rules: rules.map((rule) => ({
      id: rule.id,
      user_id: rule.user_id,
      instrument_id: rule.instrument_id,
      name: rule.name,
      condition: rule.condition,
      active: rule.active,
      throttle_state: rule.throttle_state,
    })),
    markets,
    clock,
    userAlertsToday: new Map([[input.userId, userAlertsToday]]),
    evaluateAlerting: async (context, evalClock) => {
      const result = await evaluateDomain(
        "alerting",
        context,
        {
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
            return { id: crypto.randomUUID() };
          },
        },
        { clock: evalClock },
      );
      return { outcome: result.outcome };
    },
  });

  for (const update of cycle.ruleUpdates) {
    stubPatchAlertRule(input.userId, update.id, {
      active: update.active,
      throttle_state: update.throttle_state,
    });
  }

  const fired: AlertInstance[] = [];
  for (const draft of cycle.fires) {
    const now = clock.toISOString();
    fired.push(
      stubInsertAlert({
        id: crypto.randomUUID(),
        user_id: draft.user_id,
        alert_rule_id: draft.alert_rule_id,
        instrument_id: draft.instrument_id,
        fired_at: now,
        message: draft.message,
        payload: draft.payload,
        read: false,
        created_at: now,
      }),
    );
  }
  return fired;
}
