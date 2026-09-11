import {
  assembleDecisionTable,
  authorize,
  baselineTable,
  evaluate,
  type AuthorizeResult,
} from "../../../packages/rules-engine/src/index.ts";
import {
  decisionConditionSchema,
  decisionOutputsSchema,
  type DecisionTable,
} from "../../../packages/schemas/src/index.ts";

type QueryResult = Promise<{ data: unknown; error: { message: string } | null }>;

type AdminDb = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, value: string) => QueryResult;
    } & QueryResult;
  };
};

function asRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function loadUserRole(db: AdminDb, userId: string): Promise<string | null> {
  const { data, error } = await db.from("user_roles").select("role").eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  const row = asRows<{ role?: string }>(data)[0];
  return row?.role ?? null;
}

export async function loadPublishedEntitlementsTable(db: AdminDb): Promise<DecisionTable | null> {
  const { data: bindings, error: bindErr } = await db
    .from("rule_bindings")
    .select("domain,table_id")
    .eq("domain", "entitlements");
  if (bindErr) {
    throw new Error(bindErr.message);
  }
  const tableIds = asRows<{ table_id: string }>(bindings).map((row) => row.table_id);
  if (tableIds.length === 0) {
    return null;
  }
  const wanted = new Set(tableIds);
  const { data: tables, error: tableErr } = await db
    .from("decision_tables")
    .select("id,table_key,version,hit_policy,default_outputs,status")
    .eq("status", "published");
  if (tableErr) {
    throw new Error(tableErr.message);
  }
  const published = asRows<{
    id: string;
    table_key: string;
    hit_policy: DecisionTable["hit_policy"];
    default_outputs: Record<string, unknown>;
  }>(tables).find((row) => wanted.has(row.id));
  if (!published) {
    return null;
  }
  const { data: rows, error: rowErr } = await db
    .from("decision_rows")
    .select("*")
    .eq("table_id", published.id);
  if (rowErr) {
    throw new Error(rowErr.message);
  }
  return assembleDecisionTable({
    tableKey: published.table_key,
    hit_policy: published.hit_policy,
    default_outputs: published.default_outputs,
    rows: asRows<{
      row_key: string;
      priority: number;
      conditions: unknown;
      outputs: unknown;
      effective_from?: string | null;
      effective_to?: string | null;
    }>(rows).map((row) => ({
      row_key: row.row_key,
      priority: row.priority,
      conditions: decisionConditionSchema.array().parse(row.conditions),
      outputs: decisionOutputsSchema.parse(row.outputs),
      effective_from: row.effective_from,
      effective_to: row.effective_to,
    })),
  });
}

export async function authorizeEdgeUser(input: {
  db: AdminDb;
  userId: string | null | undefined;
  action: string;
}): Promise<AuthorizeResult> {
  return authorize({
    userId: input.userId,
    action: input.action,
    ports: {
      loadRole: (id) => loadUserRole(input.db, id),
      evaluateEntitlements: async (ctx) => {
        const table =
          (await loadPublishedEntitlementsTable(input.db)) ?? baselineTable("DT-ENT-01");
        return evaluate(table, ctx, new Date());
      },
    },
  });
}
