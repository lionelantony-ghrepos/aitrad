/**
 * Orchestration source for `embed-worker`. Bundle to `embed-worker.ts` with esbuild
 * (`--external:npm:@insforge/sdk`) before deploy.
 * Embeds news_items only.
 */
import { createAdminClient } from "npm:@insforge/sdk";
import {
  embedWorkerRequestSchema,
  embedWorkerResponseSchema,
  newsItemSchema,
} from "../../packages/schemas/src/index.ts";
import {
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_OPENROUTER_EMBEDDINGS_URL,
  formatVectorLiteral,
  hashEmbed,
  newsEmbedText,
  requestOpenRouterEmbedding,
  runEmbedCycle,
  type GatewayEmbedResult,
} from "../../packages/rag/src/index.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function asRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

export default async function (req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  const expected = Deno.env.get("API_KEY") ?? Deno.env.get("INSFORGE_API_KEY");
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!expected || token !== expected) {
    return json(401, { error: "UNAUTHENTICATED" });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = embedWorkerRequestSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return json(400, { error: "INVALID_BODY" });
  }

  const baseUrl = Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL");
  const admin = createAdminClient({
    baseUrl,
    apiKey: expected,
  });

  const batch = parsed.data.op === "backfill" ? 100 : 32;
  const pendingRpc = await admin.database.rpc("list_pending_news_embeds", {
    p_limit: batch,
    p_ids: parsed.data.news_ids ?? null,
  });
  if (pendingRpc.error) {
    return json(500, { error: pendingRpc.error.message });
  }

  const pending = asRows<Record<string, unknown>>(pendingRpc.data).map((row) => {
    const item = newsItemSchema.parse(row);
    return {
      id: item.id,
      headline: item.headline,
      body: item.body,
      attempts: Number(row.attempts ?? 0),
    };
  });

  const mode = (Deno.env.get("MERIDIAN_EMBEDDING_MODE") ?? "").trim().toLowerCase();
  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  const model = Deno.env.get("OPENROUTER_EMBEDDING_MODEL") ?? DEFAULT_EMBEDDING_MODEL;
  const useHash = mode === "hash" || (!openRouterKey && mode !== "openrouter");

  async function embedText(text: string): Promise<GatewayEmbedResult> {
    if (useHash) {
      return { ok: true, vector: hashEmbed(text) };
    }
    if (!openRouterKey) {
      return { ok: false, error: "OPENROUTER_API_KEY_MISSING", status: 500 };
    }
    try {
      return await requestOpenRouterEmbedding({
        apiKey: openRouterKey,
        model,
        text,
        url: Deno.env.get("OPENROUTER_EMBEDDINGS_URL") ?? DEFAULT_OPENROUTER_EMBEDDINGS_URL,
      });
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "GATEWAY_UNAVAILABLE",
        status: 503,
      };
    }
  }

  const result = await runEmbedCycle(pending, {
    embedText,
    toEmbedText: (item) => newsEmbedText(item),
    storeEmbedding: async (newsId, vector) => {
      const { error } = await admin.database.from("news_embeddings").upsert(
        [
          {
            news_id: newsId,
            embedding: formatVectorLiteral(vector),
            embedding_model: useHash ? "meridian/hash-embed" : model,
          },
        ],
        { onConflict: "news_id" },
      );
      if (error) {
        throw new Error(error.message);
      }
      await admin.database.from("news_embed_dead_letters").delete().eq("news_id", newsId);
    },
    recordFailure: async (input) => {
      const { error } = await admin.database.from("news_embed_dead_letters").upsert(
        [
          {
            news_id: input.newsId,
            attempts: input.attempts,
            last_error: input.error,
            last_http_status: input.status ?? null,
            dead: input.dead,
          },
        ],
        { onConflict: "news_id" },
      );
      if (error) {
        throw new Error(error.message);
      }
    },
  });

  await admin.database.from("audit_log").insert([
    {
      action: "embed-worker",
      entity_type: "news_embeddings",
      payload: { op: parsed.data.op, ...result },
    },
  ]);

  return json(200, embedWorkerResponseSchema.parse(result));
}
