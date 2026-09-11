import {
  alertInstanceSchema,
  alertRulePatchSchema,
  alertRuleSchema,
  type AlertInstance,
  type AlertRule,
  type AlertRuleInsert,
  type AlertRulePatch,
} from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, recordTables } from "./rest";

export function createAlertRulesRepository(client: RecordsClient) {
  return {
    listMine() {
      return client.list(recordTables.alert_rules, alertRuleSchema);
    },
    insert(row: AlertRuleInsert) {
      return client.insert(recordTables.alert_rules, alertRuleSchema, [row]);
    },
    update(id: string, patch: AlertRulePatch) {
      return client.update(
        recordTables.alert_rules,
        alertRuleSchema,
        { id: eqFilter(id) },
        alertRulePatchSchema.parse(patch),
      );
    },
    remove(id: string) {
      return client.remove(recordTables.alert_rules, { id: eqFilter(id) });
    },
  };
}

export function createAlertsRepository(client: RecordsClient) {
  return {
    listMine() {
      return client.list(recordTables.alerts, alertInstanceSchema);
    },
    markRead(id: string, read: boolean) {
      return client.update(
        recordTables.alerts,
        alertInstanceSchema,
        { id: eqFilter(id) },
        {
          read,
        },
      );
    },
  };
}

export type AlertRulesRepository = ReturnType<typeof createAlertRulesRepository>;
export type AlertsRepository = ReturnType<typeof createAlertsRepository>;
export type { AlertInstance, AlertRule };
