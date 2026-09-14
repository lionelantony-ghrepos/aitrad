import { describe, expect, it } from "vitest";
import { actionAwareLlm } from "./fake-llm";

describe("actionAwareLlm write routing", () => {
  it("emits propose_order for a buy phrase", async () => {
    const turn = await actionAwareLlm().complete([
      { role: "user", content: "buy 10 AAPL at market" },
    ]);
    expect(turn.tool_calls?.[0]?.name).toBe("propose_order");
    expect(turn.tool_calls?.[0]?.arguments).toMatchObject({
      symbol: "AAPL",
      side: "buy",
      qty: 10,
    });
  });

  it("emits create_watchlist_item for add-to-watchlist", async () => {
    const turn = await actionAwareLlm().complete([
      { role: "user", content: "add NVDA to my watchlist" },
    ]);
    expect(turn.tool_calls?.[0]?.name).toBe("create_watchlist_item");
  });
});
