import { describe, expect, it } from "vitest";
import { compileAlertTemplate, defaultAlertName } from "./alert-templates";

describe("compileAlertTemplate", () => {
  it("emits rules-engine condition cells for each typed form", () => {
    expect(compileAlertTemplate({ kind: "price_cross_above", threshold: 200 }).conditions).toEqual([
      { input: "last", op: "gt", value: 200 },
      { input: "prev_last", op: "lte", value: 200 },
    ]);
    expect(compileAlertTemplate({ kind: "news_sentiment" }).conditions[0]?.input).toBe(
      "news_sentiment",
    );
    expect(defaultAlertName("price_cross_above", 200, "AAPL")).toContain("AAPL");
  });

  it("requires a threshold except for news sentiment", () => {
    expect(() => compileAlertTemplate({ kind: "rsi" })).toThrow("ALERT_THRESHOLD_REQUIRED");
    expect(compileAlertTemplate({ kind: "news_sentiment" }).conditions).toHaveLength(1);
  });
});
