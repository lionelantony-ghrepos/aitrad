/**
 * Admin health snapshot. Bundle: pnpm functions:bundle:health-service
 */
import { createAdminClient, createClient } from "npm:@insforge/sdk";
import {
  baselineTable,
  evaluate,
  handleHealthServiceRequest,
  resolveRulesServiceApiKey,
} from "../../packages/rules-engine/src/index.ts";
import { telemetryRecordSchema } from "../../packages/schemas/src/index.ts";
import { loadPublishedEntitlementsTable, loadUserRole } from "./_shared/entitlements.ts";
import { withFunctionLog } from "./_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-request-id",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return json(401, { error: "UNAUTHENTICATED" });
  }
  const apiKey = resolveRulesServiceApiKey({
    API_KEY: Deno.env.get("API_KEY"),
    INSFORGE_API_KEY: Deno.env.get("INSFORGE_API_KEY"),
  });
  const baseUrl = Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL");
  if (!baseUrl || !apiKey) {
    return json(500, { error: "API_KEY_MISSING" });
  }
  const userClient = createClient({ baseUrl, accessToken: token });
  const { data: userData } = await userClient.auth.getCurrentUser();
  const userId = (userData?.user?.id as string | undefined) ?? null;
  const admin = createAdminClient({ baseUrl, apiKey });
  const result = await handleHealthServiceRequest({
    method: req.method,
    body: { op: "snapshot" },
    userId,
    ports: {
      async loadRole(id) {
        return loadUserRole(admin.database, id);
      },
      async evaluateEntitlements(ctx) {
        const table =
          (await loadPublishedEntitlementsTable(admin.database)) ?? baselineTable("DT-ENT-01");
        return evaluate(table, ctx, new Date());
      },
      now: () => new Date(),
      async listTelemetry() {
        const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data, error } = await admin.database
          .from("telemetry")
          .select("*")
          .gte("created_at", since);
        if (error) {
          throw new Error(error.message);
        }
        return asRows<unknown>(data).map((row) => telemetryRecordSchema.parse(row));
      },
      async getFeedHeartbeat() {
        const { data, error } = await admin.database
          .from("feature_flags")
          .select("key,value")
          .eq("key", "feed.last_heartbeat")
          .is("user_id", null);
        if (error) {
          throw new Error(error.message);
        }
        const row = asRows<{ value?: unknown }>(data)[0];
        const value =
          row?.value && typeof row.value === "object"
            ? (row.value as { ts?: unknown; session?: unknown; ticks_applied?: unknown })
            : {};
        return {
          ts: typeof value.ts === "string" ? value.ts : null,
          session: typeof value.session === "string" ? value.session : null,
          ticks_applied: typeof value.ticks_applied === "number" ? value.ticks_applied : null,
        };
      },
    },
  });
  return json(result.status, result.body);
}

export default withFunctionLog("health-service", handle);
