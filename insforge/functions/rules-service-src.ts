/**
 * Orchestration source for `rules-service`. Deno deploy is a single file:
 * bundle to `rules-service.ts` with esbuild (`--external:npm:@insforge/sdk`).
 */
import { createAdminClient, createClient } from "npm:@insforge/sdk";
import {
  decisionConditionSchema,
  decisionOutputsSchema,
} from "../../packages/schemas/src/index.ts";
import {
  assembleDecisionTable,
  handleRulesServiceRequest,
  PublishedRulesCache,
  resolveRulesServiceApiKey,
  RULES_PUBLISHED_EVENT,
  type PublishedDomainTable,
  type RuleAuditWrite,
} from "../../packages/rules-engine/src/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const cache = new PublishedRulesCache();

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type AdminDb = ReturnType<typeof createAdminClient>["database"];

async function loadPublishedTables(db: AdminDb, domain: string): Promise<PublishedDomainTable[]> {
  const { data: bindings, error: bindErr } = await db
    .from("rule_bindings")
    .select("domain,table_id")
    .eq("domain", domain);
  if (bindErr) {
    throw new Error(bindErr.message);
  }
  const tableIds = (bindings ?? []).map((row) => (row as { table_id: string }).table_id);
  if (tableIds.length === 0) {
    return [];
  }
  const { data: tables, error: tableErr } = await db
    .from("decision_tables")
    .select("id,table_key,version,hit_policy,default_outputs,status")
    .eq("status", "published");
  if (tableErr) {
    throw new Error(tableErr.message);
  }
  const wanted = new Set(tableIds);
  const published = (tables ?? []).filter((row) => wanted.has((row as { id: string }).id));
  const { data: rows, error: rowErr } = await db.from("decision_rows").select("*");
  if (rowErr) {
    throw new Error(rowErr.message);
  }
  const rowsByTable = new Map<string, typeof published>();
  for (const row of rows ?? []) {
    const rec = row as { table_id: string };
    const list = rowsByTable.get(rec.table_id) ?? [];
    list.push(row as never);
    rowsByTable.set(rec.table_id, list);
  }

  return published.map((table) => {
    const rec = table as {
      id: string;
      table_key: string;
      version: number;
      hit_policy: "FIRST" | "ALL" | "COLLECT";
      default_outputs: Record<string, unknown>;
    };
    const tableRows = (rowsByTable.get(rec.id) ?? []) as Array<{
      row_key: string;
      priority: number;
      conditions: unknown;
      outputs: unknown;
      effective_from: string | null;
      effective_to: string | null;
    }>;
    return {
      domain,
      tableKey: rec.table_key,
      version: rec.version,
      table: assembleDecisionTable({
        tableKey: rec.table_key,
        hit_policy: rec.hit_policy,
        default_outputs: rec.default_outputs,
        rows: tableRows
          .map((row) => ({
            row_key: row.row_key,
            priority: row.priority,
            conditions: decisionConditionSchema.array().parse(row.conditions),
            outputs: decisionOutputsSchema.parse(row.outputs),
            effective_from: row.effective_from,
            effective_to: row.effective_to,
          }))
          .sort((a, b) => a.priority - b.priority),
      }),
    };
  });
}

function bumpGeneration(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n + 1 : 1;
}

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  const userToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const apiKey = resolveRulesServiceApiKey({
    API_KEY: Deno.env.get("API_KEY"),
    INSFORGE_API_KEY: Deno.env.get("INSFORGE_API_KEY"),
  });
  if (!apiKey) {
    return json(500, { error: "SERVICE_KEY_UNAVAILABLE" });
  }
  if (!userToken) {
    return json(401, { error: "UNAUTHENTICATED" });
  }
  const isService = userToken === apiKey;

  const admin = createAdminClient({
    baseUrl: Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL"),
    apiKey,
  });

  let userId: string | null = null;
  if (!isService) {
    const userClient = createClient({
      baseUrl: Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL"),
      accessToken: userToken,
    });
    const { data: userData } = await userClient.auth.getCurrentUser();
    userId = (userData?.user?.id as string | undefined) ?? null;
    if (!userId) {
      return json(401, { error: "UNAUTHENTICATED" });
    }
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (isService && body && typeof body === "object" && "userId" in body) {
    const raw = (body as { userId?: unknown }).userId;
    userId = typeof raw === "string" ? raw : userId;
  }

  const result = await handleRulesServiceRequest({
    method: req.method,
    body,
    userId,
    isService,
    cache,
    ports: {
      async loadPublishedTables(domain) {
        return loadPublishedTables(admin.database, domain);
      },
      async writeRuleAudit(row: RuleAuditWrite) {
        const id = crypto.randomUUID();
        const insert = await admin.database.from("rule_audit").insert([
          {
            id,
            user_id: userId,
            domain: row.domain,
            table_versions: row.table_versions,
            context: row.context,
            matched_rows: row.matched_rows,
            outcome: row.outcome,
            latency_ms: row.latency_ms,
          },
        ]);
        if (insert.error) {
          throw new Error(insert.error.message);
        }
        return { id };
      },
      async publishTable() {
        const { data, error } = await admin.database
          .from("feature_flags")
          .select("id,value")
          .eq("key", "rules.publish_generation");
        if (error) {
          throw new Error(error.message);
        }
        const flag = Array.isArray(data) ? data[0] : null;
        const rec = flag as { id?: string; value?: unknown } | null;
        if (rec?.id) {
          const update = await admin.database
            .from("feature_flags")
            .update({ value: bumpGeneration(rec.value) })
            .eq("id", rec.id);
          if (update.error) {
            throw new Error(update.error.message);
          }
        }
      },
      async notifyPublished(payload) {
        const { error } = await admin.database.rpc("publish_rules_published", {
          payload: { ...payload, event: RULES_PUBLISHED_EVENT },
        });
        if (error) {
          throw new Error(error.message);
        }
      },
      async writeAuditLog(row) {
        const insert = await admin.database.from("audit_log").insert([
          {
            user_id: row.user_id,
            action: row.action,
            entity_type: row.entity_type,
            entity_id: row.entity_id ?? null,
            payload: row.payload,
          },
        ]);
        if (insert.error) {
          throw new Error(insert.error.message);
        }
      },
      async readPublishGeneration() {
        const { data, error } = await admin.database
          .from("feature_flags")
          .select("value")
          .eq("key", "rules.publish_generation");
        if (error) {
          throw new Error(error.message);
        }
        const flag = Array.isArray(data) ? data[0] : null;
        return String((flag as { value?: unknown } | null)?.value ?? "0");
      },
    },
  });

  return json(result.status, result.body);
}
