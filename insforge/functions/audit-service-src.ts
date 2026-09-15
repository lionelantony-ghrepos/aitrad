/**
 * Orchestration source for `audit-service`. Bundle to `audit-service.ts`.
 */
import { createAdminClient, createClient } from "npm:@insforge/sdk";
import { auditLogSchema } from "../../packages/schemas/src/index.ts";
import {
  baselineTable,
  evaluate,
  handleAuditServiceRequest,
  resolveRulesServiceApiKey,
} from "../../packages/rules-engine/src/index.ts";
import { writeAuditLog } from "./_shared/audit.ts";
import { loadPublishedEntitlementsTable, loadUserRole } from "./_shared/entitlements.ts";
import { withFunctionLog } from "./_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const RETENTION_KEY = "audit.retention_days";
const CHAIN_KEY = "audit.chain_status";
const CRON_KEY = "audit.last_cron_date";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

type AdminDb = ReturnType<typeof createAdminClient>["database"];

async function readFlag(db: AdminDb, key: string): Promise<unknown> {
  const { data, error } = await db
    .from("feature_flags")
    .select("value")
    .eq("key", key)
    .is("user_id", null);
  if (error) {
    throw new Error(error.message);
  }
  const row = asRows<{ value?: unknown }>(data)[0];
  return row?.value ?? null;
}

async function upsertFlag(db: AdminDb, key: string, value: unknown): Promise<void> {
  const existing = await db.from("feature_flags").select("id").eq("key", key).is("user_id", null);
  if (existing.error) {
    throw new Error(existing.error.message);
  }
  const id = asRows<{ id: string }>(existing.data)[0]?.id;
  if (id) {
    const updated = await db.from("feature_flags").update({ value }).eq("id", id);
    if (updated.error) {
      throw new Error(updated.error.message);
    }
    return;
  }
  const inserted = await db.from("feature_flags").insert([{ key, value, user_id: null }]);
  if (inserted.error) {
    throw new Error(inserted.error.message);
  }
}

function daysFromFlag(value: unknown): number | null {
  if (value && typeof value === "object" && "days" in value) {
    const days = Number((value as { days?: unknown }).days);
    return Number.isInteger(days) && days > 0 ? days : null;
  }
  return null;
}

export default withFunctionLog("audit-service", async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return json(401, { error: "UNAUTHENTICATED" });
  }

  const baseUrl = Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL");
  if (!baseUrl) {
    return json(500, { error: "INSFORGE_URL_MISSING" });
  }

  const apiKey = resolveRulesServiceApiKey({
    API_KEY: Deno.env.get("API_KEY"),
    INSFORGE_API_KEY: Deno.env.get("INSFORGE_API_KEY"),
  });
  if (!apiKey) {
    return json(500, { error: "API_KEY_MISSING" });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const isService = token === apiKey;
  const admin = createAdminClient({ baseUrl, apiKey });
  let userId: string | null = null;
  if (!isService) {
    const userClient = createClient({ baseUrl, accessToken: token });
    const { data: userData } = await userClient.auth.getCurrentUser();
    userId = (userData?.user?.id as string | undefined) ?? null;
    if (!userId) {
      return json(401, { error: "UNAUTHENTICATED" });
    }
  }

  const result = await handleAuditServiceRequest({
    method: "POST",
    body,
    userId,
    isService,
    ports: {
      async loadRole(id) {
        return loadUserRole(admin.database, id);
      },
      async evaluateEntitlements(ctx) {
        const table =
          (await loadPublishedEntitlementsTable(admin.database)) ?? baselineTable("DT-ENT-01");
        return evaluate(table, ctx, new Date());
      },
      async listAudit(filter) {
        let query = admin.database.from("audit_log").select("*");
        if (filter.user_id) {
          query = query.eq("user_id", filter.user_id);
        }
        if (filter.action) {
          query = query.eq("action", filter.action);
        }
        if (filter.entity_type) {
          query = query.eq("entity_type", filter.entity_type);
        }
        if (filter.entity_id) {
          query = query.eq("entity_id", filter.entity_id);
        }
        if (filter.from) {
          query = query.gte("created_at", filter.from);
        }
        if (filter.to) {
          query = query.lte("created_at", filter.to);
        }
        const limit = filter.limit ?? 100;
        const offset = filter.offset ?? 0;
        const listed = await query
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (listed.error) {
          throw new Error(listed.error.message);
        }
        const rows = asRows<unknown>(listed.data).map((row) => auditLogSchema.parse(row));
        return { rows, total: rows.length + offset };
      },
      async verifyChain(from, to) {
        const rpc = await admin.database.rpc("verify_audit_chain", {
          p_from: from ?? null,
          p_to: to ?? null,
        });
        if (rpc.error) {
          throw new Error(rpc.error.message);
        }
        const row = asRows<Record<string, unknown>>(rpc.data)[0] ?? {
          ok: true,
          checked: 0,
          broken_id: null,
          expected_hash: null,
          actual_hash: null,
          reason: null,
        };
        return {
          ok: Boolean(row.ok),
          checked: Number(row.checked ?? 0),
          broken_id: (row.broken_id as string | null) ?? null,
          expected_hash: (row.expected_hash as string | null) ?? null,
          actual_hash: (row.actual_hash as string | null) ?? null,
          reason: (row.reason as string | null) ?? null,
        };
      },
      async getRetentionDays() {
        return daysFromFlag(await readFlag(admin.database, RETENTION_KEY));
      },
      async setRetentionDays(days) {
        await upsertFlag(admin.database, RETENTION_KEY, { days });
      },
      async applyRetention(days) {
        const rpc = await admin.database.rpc("apply_audit_retention", { p_days: days });
        if (rpc.error) {
          throw new Error(rpc.error.message);
        }
        return Number(rpc.data ?? 0);
      },
      async listAdminUserIds() {
        const listed = await admin.database
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        if (listed.error) {
          throw new Error(listed.error.message);
        }
        return asRows<{ user_id: string }>(listed.data).map((row) => row.user_id);
      },
      async loadChainStatus() {
        const value = await readFlag(admin.database, CHAIN_KEY);
        if (value && typeof value === "object" && "ok" in value) {
          const row = value as Record<string, unknown>;
          return {
            ok: Boolean(row.ok),
            checked: Number(row.checked ?? 0),
            broken_id: (row.broken_id as string | null) ?? null,
            expected_hash: (row.expected_hash as string | null) ?? null,
            actual_hash: (row.actual_hash as string | null) ?? null,
            reason: (row.reason as string | null) ?? null,
          };
        }
        return {
          ok: true,
          checked: 0,
          broken_id: null,
          expected_hash: null,
          actual_hash: null,
          reason: null,
        };
      },
      async saveChainStatus(status) {
        await upsertFlag(admin.database, CHAIN_KEY, status);
      },
      utcDay() {
        return new Date().toISOString().slice(0, 10);
      },
      async lastCronDay() {
        const value = await readFlag(admin.database, CRON_KEY);
        if (value && typeof value === "object" && "day" in value) {
          return String((value as { day?: unknown }).day ?? "") || null;
        }
        return null;
      },
      async markCronDay(day) {
        await upsertFlag(admin.database, CRON_KEY, { day });
      },
      async writeAuditLog(row) {
        await writeAuditLog(admin.database, row);
      },
    },
  });

  return json(result.status, result.body);
});
