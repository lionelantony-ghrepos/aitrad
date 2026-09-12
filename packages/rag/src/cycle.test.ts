import { describe, expect, it } from "vitest";
import { nextEmbedOutcome, runEmbedCycle } from "./retry";
import { newsEmbedText } from "./hybrid";
import { hashEmbed } from "./vector";

describe("TC-023-01 embed cycle", () => {
  it("stores an embedding for a pending news item in one worker cycle", async () => {
    const stored: Array<{ id: string; dim: number }> = [];
    const result = await runEmbedCycle(
      [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          headline: "Pending headline",
          body: "Pending body",
          attempts: 0,
        },
      ],
      {
        embedText: async (text) => ({ ok: true, vector: hashEmbed(text) }),
        storeEmbedding: async (newsId, vector) => {
          stored.push({ id: newsId, dim: vector.length });
        },
        recordFailure: async () => {
          throw new Error("SHOULD_NOT_FAIL");
        },
        toEmbedText: (item) => newsEmbedText(item),
      },
    );
    expect(result).toEqual({ scanned: 1, embedded: 1, retried: 0, dead_lettered: 0 });
    expect(stored).toEqual([
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", dim: hashEmbed("x").length },
    ]);
  });
});

describe("TC-023-03 gateway failure", () => {
  it("retries then dead-letters after max attempts without throwing", async () => {
    const letters: Array<{ newsId: string; dead: boolean; attempts: number }> = [];
    const fail = { ok: false as const, error: "GATEWAY_500", status: 500 };

    expect(nextEmbedOutcome({ attemptsSoFar: 0, gateway: fail }).kind).toBe("retry");
    expect(nextEmbedOutcome({ attemptsSoFar: 1, gateway: fail }).kind).toBe("retry");
    expect(nextEmbedOutcome({ attemptsSoFar: 2, gateway: fail }).kind).toBe("dead_letter");

    const result = await runEmbedCycle(
      [{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", headline: "x", body: "y", attempts: 2 }],
      {
        embedText: async () => fail,
        storeEmbedding: async () => {
          throw new Error("SHOULD_NOT_STORE");
        },
        recordFailure: async (row) => {
          letters.push({ newsId: row.newsId, dead: row.dead, attempts: row.attempts });
        },
        toEmbedText: (item) => newsEmbedText(item),
      },
    );
    expect(result.dead_lettered).toBe(1);
    expect(result.embedded).toBe(0);
    expect(letters).toEqual([
      { newsId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", dead: true, attempts: 3 },
    ]);
  });
});
