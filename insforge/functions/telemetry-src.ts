/**
 * Client + service telemetry ingest. Bundle: pnpm functions:bundle:telemetry
 */
import { createAdminClient, createClient } from "npm:@insforge/sdk";
import {
  baselineTable,
  evaluate,
  handleTelemetryRequest,
  parseTelemetrySampleRate,
  resolveRulesServiceApiKey,
} from "../../packages/rules-engine/src/index.ts";
import { writeAuditLog } from "./_shared/audit.ts";
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

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const apiKey = resolveRulesServiceApiKey({
    API_KEY: Deno.env.get("API_KEY"),
    INSFORGE_API_KEY: Deno.env.get("INSFORGE_API_KEY"),
  });
  const baseUrl = Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL");
  if (!baseUrl || !apiKey) {
    return json(500, { error: "API_KEY_MISSING" });
  }
  const isService = Boolean(token && token === apiKey);
  let userId: string | null = null;
  if (!isService) {
    if (!token) {
      return json(401, { error: "UNAUTHENTICATED" });
    }
    const userClient = createClient({ baseUrl, accessToken: token });
    const { data: userData } = await userClient.auth.getCurrentUser();
    userId = (userData?.user?.id as string | undefined) ?? null;
  }
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const admin = createAdminClient({ baseUrl, apiKey });
  const result = await handleTelemetryRequest({
    method: req.method,
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
      now: () => new Date(),
      sampleRate: () => parseTelemetrySampleRate(Deno.env.get("TELEMETRY_SAMPLE_RATE"), 1),
      async insertTelemetry(row) {
        const insert = await admin.database.from("telemetry").insert([row]);
        if (insert.error) {
          throw new Error(insert.error.message);
        }
      },
      async writeAuditLog(row) {
        await writeAuditLog(admin.database, row);
      },
    },
  });
  return json(result.status, result.body);
}

export default withFunctionLog("telemetry", handle);
