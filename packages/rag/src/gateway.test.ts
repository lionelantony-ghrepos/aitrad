import { describe, expect, it } from "vitest";
import { parseEmbeddingsResponse, requestOpenRouterEmbedding } from "./gateway";
import { RAG_CANNED_FIXTURES } from "./fixtures";

describe("embeddings gateway parsing", () => {
  it("accepts a 1536-float payload and rejects a dim mismatch", () => {
    const vector = Array.from({ length: 1536 }, (_, i) => (i === 0 ? 1 : 0));
    expect(parseEmbeddingsResponse({ data: [{ embedding: vector }] }).ok).toBe(true);
    expect(parseEmbeddingsResponse({ data: [{ embedding: [1, 2, 3] }] }).ok).toBe(false);
  });

  it("maps HTTP 500 to a non-throwing gateway error", async () => {
    const result = await requestOpenRouterEmbedding({
      apiKey: "test",
      model: "openai/text-embedding-3-small",
      text: "hello",
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: "boom" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.error).toBe("GATEWAY_500");
    }
  });
});

describe("corpus guard", () => {
  it("does not index engineering docs paths", () => {
    const blob = JSON.stringify(RAG_CANNED_FIXTURES);
    expect(blob).not.toMatch(/docs\/kb/);
    expect(blob).not.toContain("docs/01");
    expect(blob).not.toContain("as-built");
  });
});
