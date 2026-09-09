import { describe, expect, it } from "vitest";
import { newsItemSchema, newsTemplatesFileSchema } from "./index";

describe("news DTOs", () => {
  it("parses a news_items row including numeric sentiment strings", () => {
    const row = newsItemSchema.parse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ts: "2026-09-09T12:00:00.000Z",
      headline: "Tesla beats Q2 estimates as AI revenue jumps 12%",
      body: "Management highlighted cloud as the primary swing factor.",
      source: "Reuters",
      symbols: ["TSLA"],
      sector: "Consumer Discretionary",
      sentiment: "0.55",
      event_type: "earnings",
    });
    expect(row.sentiment).toBeCloseTo(0.55);
    expect(row.event_type).toBe("earnings");
  });

  it("rejects sentiment outside [-1, 1] and unknown event types", () => {
    expect(
      newsItemSchema.safeParse({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        ts: "2026-09-09T12:00:00.000Z",
        headline: "x",
        body: "y",
        source: "Reuters",
        symbols: ["TSLA"],
        sector: null,
        sentiment: 1.2,
        event_type: "earnings",
      }).success,
    ).toBe(false);
    expect(
      newsItemSchema.safeParse({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        ts: "2026-09-09T12:00:00.000Z",
        headline: "x",
        body: "y",
        source: "Reuters",
        symbols: ["TSLA"],
        sector: null,
        sentiment: 0,
        event_type: "gossip",
      }).success,
    ).toBe(false);
  });

  it("parses the templates file shape", () => {
    const parsed = newsTemplatesFileSchema.parse({
      earnings: [{ headline: "{company} reports", sentiment: [-0.1, 0.2] }],
      analyst: [{ headline: "{bank} on {company}", sentiment: [0, 0.1] }],
      macro: [{ headline: "{sector} {direction}", sentiment: [-0.5, 0.5] }],
      product: [{ headline: "{company} {product}", sentiment: [0.1, 0.2] }],
      regulatory: [{ headline: "{agency} {issue}", sentiment: [-0.2, 0] }],
      mna: [{ headline: "{company} {targetco}", sentiment: [0, 0.4] }],
      fills: { bank: ["UBS"] },
    });
    expect(parsed.fills.bank).toEqual(["UBS"]);
  });
});
