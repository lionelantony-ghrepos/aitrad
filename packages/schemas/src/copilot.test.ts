import { describe, expect, it } from "vitest";
import {
  COPILOT_MAX_TOOL_CALLS,
  COPILOT_SYSTEM_PROMPT,
  copilotActionSchema,
  copilotChatEventSchema,
  copilotChatRequestSchema,
  copilotOrchestratorDecideRequestSchema,
  getQuoteToolInputSchema,
  proposeOrderToolInputSchema,
  searchNewsToolInputSchema,
} from "./copilot";

describe("copilot schemas", () => {
  it("keeps the loop bound as an engineering constant", () => {
    expect(COPILOT_MAX_TOOL_CALLS).toBe(8);
    expect(COPILOT_SYSTEM_PROMPT).toContain("Never state a price");
  });

  it("parses chat requests and quote tool input", () => {
    expect(copilotChatRequestSchema.parse({ message: "summarize AAPL news today" }).message).toBe(
      "summarize AAPL news today",
    );
    expect(getQuoteToolInputSchema.parse({ symbol: " aapl " }).symbol).toBe("aapl");
    expect(searchNewsToolInputSchema.parse({ query: "AAPL", symbols: ["AAPL"] }).symbols).toEqual([
      "AAPL",
    ]);
  });

  it("parses stream events", () => {
    expect(
      copilotChatEventSchema.parse({
        type: "tool_start",
        name: "search_news",
        label: "Searching news…",
        call_id: "c1",
      }).type,
    ).toBe("tool_start");
    const action = copilotActionSchema.parse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      user_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      session_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      tool: "propose_order",
      payload: { symbol: "AAPL", side: "buy", qty: 10 },
      policy_outcome: { decision: "require_approval" },
      status: "proposed",
      executed_ref: null,
      reject_reason: null,
      created_at: "2026-09-14T00:00:00.000Z",
      updated_at: "2026-09-14T00:00:00.000Z",
    });
    expect(copilotChatEventSchema.parse({ type: "action", action }).type).toBe("action");
    expect(proposeOrderToolInputSchema.parse({ symbol: "aapl", side: "buy", qty: 10 }).symbol).toBe(
      "aapl",
    );
    expect(
      copilotOrchestratorDecideRequestSchema.parse({
        op: "decide",
        action_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        decision: "approve",
      }).op,
    ).toBe("decide");
  });
});
