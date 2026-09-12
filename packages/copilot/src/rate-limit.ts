import { baselineTable, evaluate } from "@meridian/rules-engine";

export type RateLimitVerdict = { limited: true; message: string } | { limited: false };

export function rateLimitFromAiPolicy(outcome: unknown): RateLimitVerdict {
  if (!outcome || typeof outcome !== "object" || !("decision" in outcome)) {
    return { limited: false };
  }
  const decision = (outcome as { decision?: unknown }).decision;
  if (decision !== "rate_limit") {
    return { limited: false };
  }
  const message = (outcome as { message?: unknown }).message;
  return {
    limited: true,
    message:
      typeof message === "string" && message.length > 0 ? message : "Daily copilot quota reached.",
  };
}

/** Evaluates published-equivalent DT-AI-01. Thresholds stay in the table. */
export function evaluateCopilotRateLimit(facts: {
  messages_today: number;
  tool?: string;
  clock?: Date;
}): RateLimitVerdict {
  const table = baselineTable("DT-AI-01");
  const result = evaluate(
    table,
    { messages_today: facts.messages_today, tool: facts.tool ?? "chat" },
    facts.clock ?? new Date(),
  );
  return rateLimitFromAiPolicy(result.outcome);
}
