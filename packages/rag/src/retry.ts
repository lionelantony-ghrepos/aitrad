/** Operational retry bound for the embeddings gateway, not a trading policy cell. */
export const EMBED_MAX_ATTEMPTS = 3;

export type GatewayEmbedResult =
  { ok: true; vector: number[] } | { ok: false; error: string; status?: number };

export type EmbedAttemptOutcome =
  | { kind: "embedded"; vector: number[] }
  | { kind: "retry"; attempts: number; error: string; status?: number }
  | { kind: "dead_letter"; attempts: number; error: string; status?: number };

export function nextEmbedOutcome(input: {
  attemptsSoFar: number;
  gateway: GatewayEmbedResult;
  maxAttempts?: number;
}): EmbedAttemptOutcome {
  const max = input.maxAttempts ?? EMBED_MAX_ATTEMPTS;
  if (input.gateway.ok) {
    return { kind: "embedded", vector: input.gateway.vector };
  }
  const attempts = input.attemptsSoFar + 1;
  if (attempts >= max) {
    return {
      kind: "dead_letter",
      attempts,
      error: input.gateway.error,
      status: input.gateway.status,
    };
  }
  return {
    kind: "retry",
    attempts,
    error: input.gateway.error,
    status: input.gateway.status,
  };
}

export type EmbedCycleItem = {
  id: string;
  headline: string;
  body: string;
  attempts: number;
};

export type EmbedCycleDeps = {
  embedText: (text: string) => Promise<GatewayEmbedResult>;
  storeEmbedding: (newsId: string, vector: number[]) => Promise<void>;
  recordFailure: (input: {
    newsId: string;
    attempts: number;
    error: string;
    status?: number;
    dead: boolean;
  }) => Promise<void>;
  toEmbedText: (item: EmbedCycleItem) => string;
};

export async function runEmbedCycle(
  items: readonly EmbedCycleItem[],
  deps: EmbedCycleDeps,
): Promise<{ scanned: number; embedded: number; retried: number; dead_lettered: number }> {
  let embedded = 0;
  let retried = 0;
  let deadLettered = 0;
  for (const item of items) {
    const gateway = await deps.embedText(deps.toEmbedText(item));
    const outcome = nextEmbedOutcome({ attemptsSoFar: item.attempts, gateway });
    if (outcome.kind === "embedded") {
      await deps.storeEmbedding(item.id, outcome.vector);
      embedded += 1;
      continue;
    }
    await deps.recordFailure({
      newsId: item.id,
      attempts: outcome.attempts,
      error: outcome.error,
      status: outcome.status,
      dead: outcome.kind === "dead_letter",
    });
    if (outcome.kind === "dead_letter") {
      deadLettered += 1;
    } else {
      retried += 1;
    }
  }
  return { scanned: items.length, embedded, retried, dead_lettered: deadLettered };
}
