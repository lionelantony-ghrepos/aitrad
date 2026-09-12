/**
 * Orchestration source for `search-news`. Bundle to `search-news.ts` with esbuild
 * (`--external:npm:@insforge/sdk`) before deploy.
 */
import { createAdminClient, createClient } from "npm:@insforge/sdk";
import {
  NEWS_SEARCH_LIMIT,
  newsSearchRequestSchema,
  newsSearchResponseSchema,
} from "../../packages/schemas/src/index.ts";
import { resolveRulesServiceApiKey } from "../../packages/rules-engine/src/index.ts";
import { authorizeEdgeUser } from "./_shared/entitlements.ts";
import {
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_OPENROUTER_EMBEDDINGS_URL,
  formatVectorLiteral,
  hashEmbed,
  requestOpenRouterEmbedding,
} from "../../packages/rag/src/index.ts";

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
  const parsed = newsSearchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, { error: "INVALID_BODY" });
  }

  const userClient = createClient({ baseUrl, accessToken: token });
  const { data: userData } = await userClient.auth.getCurrentUser();
  const userId = userData?.user?.id as string | undefined;
  const apiKey = resolveRulesServiceApiKey({
    API_KEY: Deno.env.get("API_KEY"),
    INSFORGE_API_KEY: Deno.env.get("INSFORGE_API_KEY"),
  });
  if (!apiKey) {
    return json(500, { error: "API_KEY_MISSING" });
  }
  const admin = createAdminClient({ baseUrl, apiKey });
  const gate = await authorizeEdgeUser({ db: admin.database, userId, action: "news:search" });
  if (!gate.allowed || !userId) {
    return json(gate.reason === "UNAUTHENTICATED" || !userId ? 401 : 403, {
      error: gate.reason ?? "UNAUTHENTICATED",
    });
  }

  const mode = (Deno.env.get("MERIDIAN_EMBEDDING_MODE") ?? "").trim().toLowerCase();
  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  const model = Deno.env.get("OPENROUTER_EMBEDDING_MODEL") ?? DEFAULT_EMBEDDING_MODEL;
  const useHash = mode === "hash" || (!openRouterKey && mode !== "openrouter");

  let queryVector: number[];
  if (useHash) {
    queryVector = hashEmbed(parsed.data.query);
  } else if (!openRouterKey) {
    return json(503, { error: "SEARCH_UNAVAILABLE" });
  } else {
    let embedded;
    try {
      embedded = await requestOpenRouterEmbedding({
        apiKey: openRouterKey,
        model,
        text: parsed.data.query,
        url: Deno.env.get("OPENROUTER_EMBEDDINGS_URL") ?? DEFAULT_OPENROUTER_EMBEDDINGS_URL,
      });
    } catch {
      return json(503, { error: "SEARCH_UNAVAILABLE" });
    }
    if (!embedded.ok) {
      return json(503, { error: "SEARCH_UNAVAILABLE" });
    }
    queryVector = embedded.vector;
  }

  const limit = parsed.data.limit ?? 10;
  const rpc = await admin.database.rpc("search_news_hybrid", {
    query_embedding: formatVectorLiteral(queryVector),
    p_symbols: parsed.data.symbols ?? null,
    p_since: parsed.data.since ?? null,
    p_limit: Math.min(limit, NEWS_SEARCH_LIMIT),
  });
  if (rpc.error) {
    return json(500, { error: rpc.error.message });
  }

  await admin.database.from("audit_log").insert([
    {
      user_id: userId,
      action: "news:search",
      entity_type: "news_items",
      payload: { query: parsed.data.query, symbols: parsed.data.symbols ?? null },
    },
  ]);

  return json(
    200,
    newsSearchResponseSchema.parse({
      items: asRows<Record<string, unknown>>(rpc.data),
    }),
  );
}
