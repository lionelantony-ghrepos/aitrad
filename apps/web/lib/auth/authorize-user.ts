import { z } from "zod";
import {
  assembleDecisionTable,
  authorize,
  baselineTable,
  memoryPublishedTables,
  type AuthorizeResult,
} from "@meridian/rules-engine";
import {
  decisionConditionSchema,
  decisionOutputsSchema,
  userRoleSchema,
  type DecisionTable,
} from "@meridian/schemas";
import { createRecordsClient } from "../api/client";
import { eqFilter, recordTables } from "../api/rest";
import { readPublicInsforgeEnv } from "../insforge/env";
import { isAuthStub } from "./mode";
import { stubGetRole, stubRulesMemory } from "./stub-store";

const roleRowSchema = z.object({ role: userRoleSchema });
const bindingRowSchema = z.object({ table_id: z.string() });
const tableRowSchema = z.object({
  id: z.string(),
  table_key: z.string(),
  hit_policy: z.enum(["FIRST", "ALL", "COLLECT"]),
  default_outputs: z.record(z.unknown()),
});
const decisionRowSchema = z.object({
  row_key: z.string(),
  priority: z.number(),
  conditions: z.unknown(),
  outputs: z.unknown(),
  effective_from: z.string().nullable().optional(),
  effective_to: z.string().nullable().optional(),
});

export async function authorizeUser(input: {
  userId: string | null | undefined;
  action: string;
  token?: string | null;
}): Promise<AuthorizeResult> {
  if (!input.userId) {
    return { allowed: false, decision: "deny", reason: "UNAUTHENTICATED" };
  }
  const facts = await loadEntitlementFacts(input.userId, input.token);
  return authorize({
    userId: input.userId,
    action: input.action,
    role: facts.role,
    table: facts.table,
  });
}

export async function loadEntitlementFacts(
  userId: string,
  token?: string | null,
): Promise<{ role: string; table: DecisionTable }> {
  if (isAuthStub()) {
    const published = memoryPublishedTables(stubRulesMemory(), "entitlements")[0]?.table;
    return {
      role: stubGetRole(userId),
      table: published ?? baselineTable("DT-ENT-01"),
    };
  }
  if (!token) {
    return { role: "unknown", table: baselineTable("DT-ENT-01") };
  }
  const env = readPublicInsforgeEnv();
  const client = createRecordsClient({
    baseUrl: env.baseUrl,
    getAccessToken: () => token,
  });
  const roles = await client.list(recordTables.user_roles, roleRowSchema, {
    query: { user_id: eqFilter(userId) },
  });
  const bindings = await client.list(recordTables.rule_bindings, bindingRowSchema, {
    query: { domain: eqFilter("entitlements") },
  });
  const tables = await client.list(recordTables.decision_tables, tableRowSchema, {
    query: { status: eqFilter("published") },
  });
  const bindIds = new Set(bindings.map((row) => row.table_id));
  const published = tables.find((row) => bindIds.has(row.id));
  const role = roles[0]?.role ?? "unknown";
  if (!published) {
    return { role, table: baselineTable("DT-ENT-01") };
  }
  const rows = await client.list(recordTables.decision_rows, decisionRowSchema, {
    query: { table_id: eqFilter(published.id) },
  });
  return {
    role,
    table: assembleDecisionTable({
      tableKey: published.table_key,
      hit_policy: published.hit_policy,
      default_outputs: published.default_outputs,
      rows: rows.map((row) => ({
        row_key: row.row_key,
        priority: row.priority,
        conditions: decisionConditionSchema.array().parse(row.conditions),
        outputs: decisionOutputsSchema.parse(row.outputs),
        effective_from: row.effective_from,
        effective_to: row.effective_to,
      })),
    }),
  };
}
