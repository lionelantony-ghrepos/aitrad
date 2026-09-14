import { groundedMonitorExplanation } from "@meridian/copilot";
import { baselineTable, evaluateDomain, runMonitorCycle } from "@meridian/rules-engine";
import type { AlertInstance } from "@meridian/schemas";
import {
  stubInsertAlert,
  stubListAlerts,
  stubListMonitors,
  stubPatchMonitor,
} from "@/lib/auth/stub-store";

export async function stubEvaluateMonitors(input: {
  userId: string;
  force_position_day_pct?: number;
  clock?: Date;
}): Promise<AlertInstance[]> {
  const clock = input.clock ?? new Date();
  const monitors = stubListMonitors(input.userId);
  const day = clock.toISOString().slice(0, 10);
  const userAlertsToday = stubListAlerts(input.userId).filter((row) =>
    row.fired_at.startsWith(day),
  ).length;

  const cycle = await runMonitorCycle({
    monitors,
    factsFor: () => ({
      position_day_pct: input.force_position_day_pct ?? 0,
      portfolio_day_pct: input.force_position_day_pct ?? 0,
      cited: ["position:AAPL"],
    }),
    clock,
    userAlertsToday: new Map([[input.userId, userAlertsToday]]),
    ignoreCadence: input.force_position_day_pct !== undefined,
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

  for (const update of cycle.updates) {
    stubPatchMonitor(input.userId, update.id, {
      active: update.active,
      last_run: update.last_run,
      throttle_state: update.throttle_state,
    });
  }

  const fired: AlertInstance[] = [];
  for (const draft of cycle.fires) {
    const now = clock.toISOString();
    const explanation = groundedMonitorExplanation({
      name: draft.message,
      nl_instruction: String(draft.payload.nl_instruction ?? draft.message),
      facts: draft.facts,
      cited: Array.isArray(draft.facts.cited) ? draft.facts.cited.map(String) : [],
    });
    fired.push(
      stubInsertAlert({
        id: crypto.randomUUID(),
        user_id: draft.user_id,
        alert_rule_id: null,
        monitor_id: draft.monitor_id,
        instrument_id: draft.instrument_id,
        fired_at: now,
        message: explanation,
        payload: { ...draft.payload, explanation },
        read: false,
        created_at: now,
      }),
    );
  }
  return fired;
}
