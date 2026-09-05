/**
 * Orchestration source for `rules-service`. Deno deploy is a single file:
 * bundle to `rules-service.ts` with esbuild (`--external:npm:@insforge/sdk`).
 */
import { createAdminClient, createClient } from "npm:@insforge/sdk";
import {
  decisionConditionSchema,
  decisionOutputsSchema,
  type DecisionTable,
} from "../../packages/schemas/src/index.ts";
import {
  assembleDecisionTable,
  diffDecisionTables,
  DOMAIN_BINDINGS,
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

type TableRec = {
  id: string;
  table_key: string;
  version: number;
  status: "draft" | "published" | "retired";
  hit_policy: "FIRST" | "ALL" | "COLLECT";
  default_outputs: Record<string, unknown>;
  rule_set_id: string;
};

async function loadRowsForTable(db: AdminDb, tableId: string): Promise<DecisionTable["rows"]> {
  const { data, error } = await db.from("decision_rows").select("*").eq("table_id", tableId);
  if (error) {
    throw new Error(error.message);
  }
  return (
    (data ?? []) as Array<{
      row_key: string;
      priority: number;
      conditions: unknown;
      outputs: unknown;
      effective_from: string | null;
      effective_to: string | null;
    }>
  )
    .map((row) => ({
      id: row.row_key,
      priority: row.priority,
      conditions: decisionConditionSchema.array().parse(row.conditions),
      outputs: decisionOutputsSchema.parse(row.outputs),
      effective_from: row.effective_from,
      effective_to: row.effective_to,
    }))
    .sort((a, b) => a.priority - b.priority);
}

async function replaceDecisionRows(
  db: AdminDb,
  tableId: string,
  table: DecisionTable,
): Promise<void> {
  const { data: existing, error: listErr } = await db
    .from("decision_rows")
    .select("id")
    .eq("table_id", tableId);
  if (listErr) {
    throw new Error(listErr.message);
  }
  for (const row of (existing ?? []) as Array<{ id: string }>) {
    const removed = await db.from("decision_rows").delete().eq("id", row.id);
    if (removed.error) {
      throw new Error(removed.error.message);
    }
  }
  if (table.rows.length === 0) {
    return;
  }
  const insert = await db.from("decision_rows").insert(
    table.rows.map((row) => ({
      table_id: tableId,
      row_key: row.id,
      priority: row.priority,
      conditions: row.conditions,
      outputs: row.outputs,
      effective_from: row.effective_from ?? null,
      effective_to: row.effective_to ?? null,
    })),
  );
  if (insert.error) {
    throw new Error(insert.error.message);
  }
}

function toDecisionTable(rec: TableRec, rows: DecisionTable["rows"]): DecisionTable {
  return assembleDecisionTable({
    tableKey: rec.table_key,
    hit_policy: rec.hit_policy,
    default_outputs: rec.default_outputs,
    rows: rows.map((row) => ({
      row_key: row.id,
      priority: row.priority,
      conditions: row.conditions,
      outputs: row.outputs,
      effective_from: row.effective_from ?? null,
      effective_to: row.effective_to ?? null,
    })),
  });
}

async function loadTablesByKey(db: AdminDb, tableKey: string): Promise<TableRec[]> {
  const { data, error } = await db.from("decision_tables").select("*").eq("table_key", tableKey);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as TableRec[];
}

function pickStatus(rows: TableRec[], status: TableRec["status"]): TableRec | undefined {
  return [...rows].sort((a, b) => b.version - a.version).find((row) => row.status === status);
}

async function domainForTableKey(db: AdminDb, tableKey: string): Promise<string> {
  const binding = DOMAIN_BINDINGS.find((row) => row.tableKey === tableKey);
  if (binding) {
    return binding.domain;
  }
  const { data, error } = await db
    .from("decision_tables")
    .select("rule_set_id")
    .eq("table_key", tableKey);
  if (error) {
    throw new Error(error.message);
  }
  const rec = Array.isArray(data) ? (data[0] as { rule_set_id?: string } | undefined) : undefined;
  if (!rec?.rule_set_id) {
    return "unknown";
  }
  const set = await db.from("rule_sets").select("domain").eq("id", rec.rule_set_id);
  const row = Array.isArray(set.data)
    ? (set.data[0] as { domain?: string } | undefined)
    : undefined;
  return row?.domain ?? "unknown";
}

async function adminGetTable(db: AdminDb, tableKey: string) {
  const versions = await loadTablesByKey(db, tableKey);
  if (versions.length === 0) {
    return null;
  }
  const published = pickStatus(versions, "published");
  const draft = pickStatus(versions, "draft");
  const publishedTable = published
    ? toDecisionTable(published, await loadRowsForTable(db, published.id))
    : null;
  const draftTable = draft
    ? toDecisionTable(draft, await loadRowsForTable(db, draft.id))
    : publishedTable;
  const domain = await domainForTableKey(db, tableKey);
  return {
    tableKey,
    domain,
    published: publishedTable,
    publishedVersion: published?.version ?? null,
    draft: draftTable,
    draftVersion: draft?.version ?? published?.version ?? null,
    diff: diffDecisionTables(publishedTable, draftTable, {
      tableKey,
      publishedVersion: published?.version ?? null,
      draftVersion: draft?.version ?? published?.version ?? null,
    }),
  };
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
      async loadCallerRole(id) {
        const { data, error } = await admin.database
          .from("profiles")
          .select("persona")
          .eq("user_id", id);
        if (error) {
          throw new Error(error.message);
        }
        const row = Array.isArray(data)
          ? (data[0] as { persona?: string | null } | undefined)
          : undefined;
        return row?.persona ?? null;
      },
      async listCatalog() {
        const { data, error } = await admin.database
          .from("decision_tables")
          .select("table_key,status,version");
        if (error) {
          throw new Error(error.message);
        }
        const byKey = new Map<
          string,
          { publishedVersion: number | null; draftVersion: number | null }
        >();
        for (const row of (data ?? []) as Array<{
          table_key: string;
          status: string;
          version: number;
        }>) {
          const current = byKey.get(row.table_key) ?? {
            publishedVersion: null,
            draftVersion: null,
          };
          if (row.status === "published") {
            current.publishedVersion = row.version;
          }
          if (row.status === "draft") {
            current.draftVersion = row.version;
          }
          byKey.set(row.table_key, current);
        }
        return [...byKey.entries()].map(([tableKey, versions]) => ({
          tableKey,
          domain: DOMAIN_BINDINGS.find((row) => row.tableKey === tableKey)?.domain ?? "unknown",
          publishedVersion: versions.publishedVersion,
          draftVersion: versions.draftVersion,
        }));
      },
      async loadAdminTable(tableKey) {
        return adminGetTable(admin.database, tableKey);
      },
      async saveDraft(tableKey, table) {
        const versions = await loadTablesByKey(admin.database, tableKey);
        const published = pickStatus(versions, "published");
        const draft = pickStatus(versions, "draft");
        const parsed = {
          ...table,
          id: tableKey,
        };
        if (draft) {
          const update = await admin.database
            .from("decision_tables")
            .update({
              hit_policy: parsed.hit_policy,
              default_outputs: parsed.default_outputs,
            })
            .eq("id", draft.id);
          if (update.error) {
            throw new Error(update.error.message);
          }
          await replaceDecisionRows(admin.database, draft.id, parsed);
        } else {
          if (!published) {
            throw new Error(`NO_PUBLISHED:${tableKey}`);
          }
          const insert = await admin.database.from("decision_tables").insert([
            {
              rule_set_id: published.rule_set_id,
              table_key: tableKey,
              status: "draft",
              version: published.version + 1,
              hit_policy: parsed.hit_policy,
              default_outputs: parsed.default_outputs,
            },
          ]);
          if (insert.error) {
            throw new Error(insert.error.message);
          }
          const created = await loadTablesByKey(admin.database, tableKey);
          const next = pickStatus(created, "draft");
          if (!next) {
            throw new Error(`DRAFT_MISSING:${tableKey}`);
          }
          await replaceDecisionRows(admin.database, next.id, parsed);
        }
        const loaded = await adminGetTable(admin.database, tableKey);
        if (!loaded) {
          throw new Error(`UNKNOWN_TABLE:${tableKey}`);
        }
        return loaded;
      },
      async publishDraft(tableKey) {
        const versions = await loadTablesByKey(admin.database, tableKey);
        const draft = pickStatus(versions, "draft");
        const published = pickStatus(versions, "published");
        if (!draft) {
          throw new Error(`NO_DRAFT:${tableKey}`);
        }
        if (published) {
          const retire = await admin.database
            .from("decision_tables")
            .update({ status: "retired" })
            .eq("id", published.id);
          if (retire.error) {
            throw new Error(retire.error.message);
          }
        }
        const promote = await admin.database
          .from("decision_tables")
          .update({ status: "published" })
          .eq("id", draft.id);
        if (promote.error) {
          throw new Error(promote.error.message);
        }
        if (published) {
          const rebound = await admin.database
            .from("rule_bindings")
            .update({ table_id: draft.id })
            .eq("table_id", published.id);
          if (rebound.error) {
            throw new Error(rebound.error.message);
          }
        }
        return { version: draft.version };
      },
      async rollbackToVersion(tableKey, version) {
        const versions = await loadTablesByKey(admin.database, tableKey);
        const source = versions.find((row) => row.version === version);
        if (!source) {
          throw new Error(`UNKNOWN_VERSION:${tableKey}:${version}`);
        }
        const published = pickStatus(versions, "published");
        const nextVersion = Math.max(...versions.map((row) => row.version)) + 1;
        const rows = await loadRowsForTable(admin.database, source.id);
        if (published) {
          const retire = await admin.database
            .from("decision_tables")
            .update({ status: "retired" })
            .eq("id", published.id);
          if (retire.error) {
            throw new Error(retire.error.message);
          }
        }
        const insert = await admin.database.from("decision_tables").insert([
          {
            rule_set_id: source.rule_set_id,
            table_key: tableKey,
            status: "published",
            version: nextVersion,
            hit_policy: source.hit_policy,
            default_outputs: source.default_outputs,
          },
        ]);
        if (insert.error) {
          throw new Error(insert.error.message);
        }
        const created = await loadTablesByKey(admin.database, tableKey);
        const next = created.find((row) => row.version === nextVersion);
        if (!next) {
          throw new Error(`ROLLBACK_MISSING:${tableKey}`);
        }
        await replaceDecisionRows(admin.database, next.id, toDecisionTable(next, rows));
        if (published) {
          const rebound = await admin.database
            .from("rule_bindings")
            .update({ table_id: next.id })
            .eq("table_id", published.id);
          if (rebound.error) {
            throw new Error(rebound.error.message);
          }
        }
        return { version: nextVersion };
      },
      async listHistory(tableKey) {
        const versions = await loadTablesByKey(admin.database, tableKey);
        const items = [];
        for (const rec of versions.sort((a, b) => b.version - a.version)) {
          items.push({
            version: rec.version,
            status: rec.status,
            table: toDecisionTable(rec, await loadRowsForTable(admin.database, rec.id)),
          });
        }
        return items;
      },
      async listAudits(input) {
        let query = admin.database.from("rule_audit").select("*");
        if (input.domain) {
          query = query.eq("domain", input.domain);
        }
        const { data, error } = await query;
        if (error) {
          throw new Error(error.message);
        }
        const rows = (data ?? []) as Array<{
          id: string;
          domain: string;
          context: Record<string, unknown>;
          outcome: unknown;
          matched_rows?: unknown;
          table_versions?: unknown;
          latency_ms?: number;
          created_at?: string;
          user_id?: string | null;
        }>;
        return rows.slice(0, input.limit ?? 50);
      },
    },
  });

  return json(result.status, result.body);
}
