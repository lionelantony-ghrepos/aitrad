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

function lastUserText(messages: ChatMessage[]): string {
  return [...messages].reverse().find((row) => row.role === "user")?.content ?? "";
}

function parseBuySell(text: string): {
  side: "buy" | "sell";
  qty: number;
  symbol: string;
  order_type: "market" | "limit";
} | null {
  const match = text.match(
    /\b(buy|sell)\s+(\d+(?:\.\d+)?)\s+([A-Za-z]{1,8})(?:\s+at\s+(market|limit))?\b/i,
  );
  if (!match) {
    return null;
  }
  const side = match[1];
  const qtyText = match[2];
  const symbol = match[3];
  if (!side || !qtyText || !symbol) {
    return null;
  }
  return {
    side: side.toLowerCase() as "buy" | "sell",
    qty: Number(qtyText),
    symbol: symbol.toUpperCase(),
    order_type: (match[4] ?? "market").toLowerCase() as "market" | "limit",
  };
}

function parseWatchlistAdd(text: string): string | null {
  const match = text.match(/\badd\s+([A-Za-z]{1,8})\s+to(?:\s+my)?\s+watchlist\b/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function parseAlert(
  text: string,
): { symbol: string; kind: "price_cross_below"; threshold?: number } | null {
  const match = text.match(/\balert\b.*\b([A-Za-z]{1,8})\b.*?(?:below|under)\s+(\d+(?:\.\d+)?)/i);
  if (!match) {
    return null;
  }
  const symbol = match[1];
  const thresholdText = match[2];
  if (!symbol || !thresholdText) {
    return null;
  }
  return {
    symbol: symbol.toUpperCase(),
    kind: "price_cross_below",
    threshold: Number(thresholdText),
  };
}

function finalizeWrite(messages: ChatMessage[]): LlmTurn {
  const lastTool = [...messages].reverse().find((row) => row.role === "tool");
  if (!lastTool) {
    return { content: "No tool result." };
  }
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(lastTool.content) as unknown;
  } catch {
    parsed = {};
  }
  if (parsed && typeof parsed === "object") {
    const row = parsed as { status?: unknown; message?: unknown; reject_reason?: unknown };
    if (row.status === "awaiting_approval") {
      return {
        content:
          typeof row.message === "string"
            ? `${row.message} Review the approval card.`
            : "Awaiting your approval. Review the card — nothing has been sent to order-service.",
      };
    }
    if (typeof row.message === "string") {
      const extra = typeof row.reject_reason === "string" ? ` ${row.reject_reason}` : "";
      return { content: `${row.message}${extra}` };
    }
  }
  return { content: lastTool.content };
}

/** Routes buy/watchlist/alert phrases to write tools; otherwise news summary. */
export function actionAwareLlm(): LlmPort {
  const news = newsSummaryLlm();
  return {
    async complete(messages: ChatMessage[]) {
      const lastTool = [...messages].reverse().find((row) => row.role === "tool");
      if (lastTool) {
        const name = lastTool.name ?? "";
        if (
          name === "propose_order" ||
          name === "create_watchlist_item" ||
          name === "create_alert" ||
          name === "create_monitor"
        ) {
          return finalizeWrite(messages);
        }
        return news.complete(messages);
      }
      const text = lastUserText(messages);
      const order = parseBuySell(text);
      if (order) {
        return {
          tool_calls: [
            {
              id: "call_propose_order",
              name: "propose_order",
              arguments: {
                symbol: order.symbol,
                side: order.side,
                qty: order.qty,
                order_type: order.order_type,
                tif: "DAY",
              },
            },
          ],
        };
      }
      const symbol = parseWatchlistAdd(text);
      if (symbol) {
        return {
          tool_calls: [
            {
              id: "call_watchlist",
              name: "create_watchlist_item",
              arguments: { symbol },
            },
          ],
        };
      }
      const alert = parseAlert(text);
      if (alert) {
        return {
          tool_calls: [
            {
              id: "call_alert",
              name: "create_alert",
              arguments: alert,
            },
          ],
        };
      }
      if (/\bmonitor\b/i.test(text)) {
        return {
          tool_calls: [
            {
              id: "call_monitor",
              name: "create_monitor",
              arguments: { nl_instruction: text },
            },
          ],
        };
      }
      return news.complete(messages);
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
