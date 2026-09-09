/**
 * Orchestration source for `screener`. Deno deploy is a single file:
 * bundle to `screener.ts` with esbuild (`--external:npm:@insforge/sdk`).
 */
import { createAdminClient, createClient } from "npm:@insforge/sdk";
import {
  compileScreenerSql,
  SCREENER_RESULT_LIMIT,
  screenerCountResponseSchema,
  screenerRowSchema,
  screenerRunRequestSchema,
  screenerRunResponseSchema,
} from "../../packages/schemas/src/index.ts";
import { authorize, resolveRulesServiceApiKey } from "../../packages/rules-engine/src/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

export default async function (req: Request): Promise<Response> {
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

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = screenerRunRequestSchema.safeParse({
    ...(body && typeof body === "object" ? body : {}),
    op:
      body && typeof body === "object" && "op" in body && (body as { op?: unknown }).op === "count"
        ? "count"
        : "run",
  });
  if (!parsed.success) {
    return json(400, { error: "INVALID_BODY" });
  }

  const userClient = createClient({ baseUrl, accessToken: token });
  const { data: userData } = await userClient.auth.getCurrentUser();
  const userId = userData?.user?.id as string | undefined;
  const gate = authorize({ userId, action: "screener:run" });
  if (!gate.allowed || !userId) {
    return json(401, { error: gate.reason ?? "UNAUTHENTICATED" });
  }

  const apiKey = resolveRulesServiceApiKey({
    API_KEY: Deno.env.get("API_KEY"),
    INSFORGE_API_KEY: Deno.env.get("INSFORGE_API_KEY"),
  });
  if (!apiKey) {
    return json(500, { error: "API_KEY_MISSING" });
  }

  const mode = parsed.data.op === "count" ? "count" : "run";
  let compiled;
  let countCompiled;
  try {
    compiled = compileScreenerSql({
      criteria: parsed.data.criteria,
      sort: parsed.data.sort,
      mode,
    });
    countCompiled = compileScreenerSql({
      criteria: parsed.data.criteria,
      sort: parsed.data.sort,
      mode: "count",
    });
  } catch {
    return json(400, { error: "CRITERIA_COMPILE_FAILED" });
  }

  const admin = createAdminClient({ baseUrl, apiKey });
  const rpc = await admin.database.rpc("exec_screener", {
    p_sql: compiled.sql,
    p_params: compiled.params,
  });
  if (rpc.error) {
    return json(500, { error: rpc.error.message });
  }

  const raw = asRows<Record<string, unknown>>(rpc.data);

  let matchCount = raw.length;
  if (mode === "run") {
    const countRpc = await admin.database.rpc("exec_screener", {
      p_sql: countCompiled.sql,
      p_params: countCompiled.params,
    });
    if (countRpc.error) {
      return json(500, { error: countRpc.error.message });
    }
    const countRows = asRows<Record<string, unknown>>(countRpc.data);
    matchCount = Number(countRows[0]?.match_count ?? raw.length);
  } else {
    matchCount = Number(raw[0]?.match_count ?? 0);
  }

  await admin.database.from("audit_log").insert([
    {
      user_id: userId,
      action: "screener:run",
      entity_type: "screens",
      payload: { mode, count: matchCount },
    },
  ]);

  if (mode === "count") {
    return json(
      200,
      screenerCountResponseSchema.parse({
        count: Number.isFinite(matchCount) ? matchCount : 0,
        truncated: matchCount > SCREENER_RESULT_LIMIT,
      }),
    );
  }

  const rows = raw.map((row) => screenerRowSchema.parse(row));
  return json(
    200,
    screenerRunResponseSchema.parse({
      rows,
      count: Number.isFinite(matchCount) ? matchCount : rows.length,
      truncated: matchCount > SCREENER_RESULT_LIMIT,
    }),
  );
}
