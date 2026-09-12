import { z } from "zod";
import { NEWS_EMBEDDING_DIM } from "@meridian/schemas";

const embeddingsResponseSchema = z.object({
  data: z
    .array(
      z.object({
        embedding: z.array(z.number()).min(1),
      }),
    )
    .min(1),
});

export const DEFAULT_OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";
export const DEFAULT_EMBEDDING_MODEL = "openai/text-embedding-3-small";

export function parseEmbeddingsResponse(
  body: unknown,
  expectedDim = NEWS_EMBEDDING_DIM,
): { ok: true; vector: number[] } | { ok: false; error: string } {
  const parsed = embeddingsResponseSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "EMBEDDINGS_RESPONSE_INVALID" };
  }
  const vector = parsed.data.data[0]?.embedding;
  if (!vector || vector.length !== expectedDim) {
    return { ok: false, error: "EMBEDDINGS_DIM_MISMATCH" };
  }
  return { ok: true, vector };
}

export async function requestOpenRouterEmbedding(input: {
  apiKey: string;
  model: string;
  text: string;
  url?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; vector: number[] } | { ok: false; error: string; status: number }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(input.url ?? DEFAULT_OPENROUTER_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      input: input.text,
      encoding_format: "float",
    }),
  });
  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: `GATEWAY_${response.status}`,
    };
  }
  const parsed = parseEmbeddingsResponse(raw);
  if (!parsed.ok) {
    return { ok: false, status: 502, error: parsed.error };
  }
  return { ok: true, vector: parsed.vector };
}
