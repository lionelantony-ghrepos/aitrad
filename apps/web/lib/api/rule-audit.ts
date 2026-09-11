import { ruleAuditViewSchema } from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, recordTables } from "./rest";

export function createRuleAuditRepository(client: RecordsClient) {
  return {
    getById(id: string) {
      return client.list(recordTables.rule_audit, ruleAuditViewSchema, {
        query: { id: eqFilter(id), limit: 1 },
      });
    },
  };
}

export type RuleAuditRepository = ReturnType<typeof createRuleAuditRepository>;
