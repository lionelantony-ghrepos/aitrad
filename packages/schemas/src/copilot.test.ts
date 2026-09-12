import { describe, expect, it } from "vitest";
import {
  COPILOT_MAX_TOOL_CALLS,
  COPILOT_SYSTEM_PROMPT,
  copilotChatEventSchema,
  copilotChatRequestSchema,
  getQuoteToolInputSchema,
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
  });
});
