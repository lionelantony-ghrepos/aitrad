import type { ChatMessage, LlmPort, LlmTurn } from "./loop";

export function scriptedLlm(turns: LlmTurn[]): LlmPort {
  let index = 0;
  return {
    async complete() {
      const turn = turns[index];
      index += 1;
      return turn ?? { content: "" };
    },
  };
}

/** Scripted transcript for “summarize AAPL news today” (TC-025-01 / TC-025-02). */
export function newsSummaryLlm(): LlmPort {
  return {
    async complete(messages: ChatMessage[]) {
      const lastTool = [...messages].reverse().find((row) => row.role === "tool");
      if (!lastTool) {
        return {
          tool_calls: [
            {
              id: "call_search_news",
              name: "search_news",
              arguments: { query: "AAPL news today", symbols: ["AAPL"], limit: 5 },
            },
          ],
        };
      }
      const parsed: unknown = JSON.parse(lastTool.content);
      const items = newsItems(parsed);
      const cites = items
        .slice(0, 2)
        .map((item) => `[news:${item.id}]`)
        .join(" ");
      const headlines = items
        .slice(0, 2)
        .map((item) => item.headline)
        .filter((row): row is string => Boolean(row))
        .join("; ");
      return {
        content: `AAPL news today (tool-cited): ${headlines || "see items"} ${cites}`.trim(),
      };
    },
  };
}

function newsItems(value: unknown): Array<{ id: string; headline?: string }> {
  if (!value || typeof value !== "object") {
    return [];
  }
  const items = (value as { items?: unknown }).items;
  if (!Array.isArray(items)) {
    return [];
  }
  return items.filter((row): row is { id: string; headline?: string } => {
    return Boolean(
      row && typeof row === "object" && typeof (row as { id?: unknown }).id === "string",
    );
  });
}
