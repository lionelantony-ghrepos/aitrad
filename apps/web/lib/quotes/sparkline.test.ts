import { describe, expect, it } from "vitest";
import { SPARKLINE_POINTS, appendSparkline } from "./sparkline";

describe("sparkline buffer", () => {
  it("caps history at 30 points", () => {
    let history: number[] = [];
    for (let i = 0; i < 40; i += 1) {
      history = appendSparkline(history, i);
    }
    expect(history).toHaveLength(SPARKLINE_POINTS);
    expect(history[0]).toBe(10);
    expect(history[29]).toBe(39);
  });
});
