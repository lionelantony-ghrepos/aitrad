import { describe, expect, it } from "vitest";
import { mergeNewsItems, parseNewsBatchPayload } from "./transport";

describe("news realtime transport", () => {
  const item = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ts: "2026-09-09T12:00:00.000Z",
    headline: "h",
    body: "b",
    source: "Reuters",
    symbols: ["TSLA"],
    sector: "Consumer Discretionary",
    sentiment: 0.1,
    event_type: "earnings" as const,
  };

  it("parses nested realtime payloads", () => {
    expect(parseNewsBatchPayload({ ts: item.ts, items: [item] })?.items).toHaveLength(1);
    expect(parseNewsBatchPayload({ payload: { ts: item.ts, items: [item] } })?.items[0]?.id).toBe(
      item.id,
    );
  });

  it("merges live items in reverse chronological order", () => {
    const older = {
      ...item,
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      ts: "2026-09-09T11:00:00.000Z",
    };
    const merged = mergeNewsItems([older], [item]);
    expect(merged.map((row) => row.id)).toEqual([item.id, older.id]);
  });
});
