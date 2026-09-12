import { describe, expect, it } from "vitest";
import { COPILOT_MAX_TOOL_CALLS, COPILOT_SYSTEM_PROMPT } from "@meridian/schemas";
import { ungroundedFigures } from "./grounding";
import { newsSummaryLlm, scriptedLlm } from "./fake-llm";
import { runOrchestratorLoop, type ChatMessage } from "./loop";
import { evaluateCopilotRateLimit } from "./rate-limit";

const NEWS_ID = "55555555-5555-4555-8555-555555555553";

const system: ChatMessage = { role: "system", content: COPILOT_SYSTEM_PROMPT };

describe("TC-025-02 orchestrator fake-LLM transcripts @TC-025-02", () => {
  it("runs a news tool loop and cites the tool news id", async () => {
    const events: string[] = [];
    const result = await runOrchestratorLoop({
      messages: [system, { role: "user", content: "summarize AAPL news today" }],
      llm: newsSummaryLlm(),
      executeTool: async (name) => {
        expect(name).toBe("search_news");
        return {
          items: [
            {
              id: NEWS_ID,
              headline: "Apple unveils next-gen AI platform",
              symbols: ["AAPL"],
            },
          ],
        };
      },
      onEvent: (event) => {
        events.push(event.type);
      },
    });
    expect(result.toolCallCount).toBe(1);
    expect(result.toolCallCount).toBeLessThanOrEqual(COPILOT_MAX_TOOL_CALLS);
    expect(result.assistantContent).toContain(`[news:${NEWS_ID}]`);
    expect(result.citations.some((row) => row.id === NEWS_ID)).toBe(true);
    expect(events).toContain("tool_start");
    expect(events).toContain("token");
    expect(
      ungroundedFigures(
        result.assistantContent,
        result.toolCalls.map((row) => row.result),
      ),
    ).toEqual([]);
  });

  it("terminates at the tool-call budget", async () => {
    const llm = scriptedLlm(
      Array.from({ length: 12 }, (_, i) => ({
        tool_calls: [{ id: `c${i}`, name: "get_quote", arguments: { symbol: "AAPL" } }],
      })),
    );
    const result = await runOrchestratorLoop({
      messages: [system, { role: "user", content: "quote forever" }],
      llm,
      executeTool: async () => ({ last: 100 }),
      maxToolCalls: 8,
    });
    expect(result.toolCallCount).toBe(8);
    expect(result.assistantContent).toContain("tool-call budget");
  });

  it("surfaces tool errors in the transcript", async () => {
    const llm = scriptedLlm([
      { tool_calls: [{ id: "c1", name: "get_quote", arguments: { symbol: "NOPE" } }] },
      { content: "Quote lookup failed: SYMBOL_NOT_FOUND" },
    ]);
    const result = await runOrchestratorLoop({
      messages: [system, { role: "user", content: "quote NOPE" }],
      llm,
      executeTool: async () => {
        throw new Error("SYMBOL_NOT_FOUND");
      },
    });
    expect(result.toolCalls[0]?.error).toBe("SYMBOL_NOT_FOUND");
    expect(result.assistantContent).toContain("SYMBOL_NOT_FOUND");
  });

  it("flags un-tooled price figures (AC-025-02 harness)", async () => {
    const llm = scriptedLlm([{ content: "AAPL last is 999.25 without a tool." }]);
    const result = await runOrchestratorLoop({
      messages: [system, { role: "user", content: "price?" }],
      llm,
      executeTool: async () => ({}),
    });
    expect(ungroundedFigures(result.assistantContent, [])).toContain("999.25");
  });
});

describe("TC-025-03 rate limit from DT-AI-01 @TC-025-03", () => {
  it("refuses when the policy outcome is rate_limit", () => {
    const over = evaluateCopilotRateLimit({ messages_today: 10_000 });
    expect(over.limited).toBe(true);
    if (over.limited) {
      expect(over.message.length).toBeGreaterThan(0);
    }
    const under = evaluateCopilotRateLimit({ messages_today: 0 });
    expect(under.limited).toBe(false);
  });
});
