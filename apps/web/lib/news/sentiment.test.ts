import { describe, expect, it } from "vitest";
import { sentimentMixPct, sentimentTone } from "./sentiment";

describe("sentiment badge scale", () => {
  it("maps -1..1 onto a 0..100 up mix and a tone", () => {
    expect(sentimentMixPct(-1)).toBe(0);
    expect(sentimentMixPct(1)).toBe(100);
    expect(sentimentMixPct(0)).toBe(50);
    expect(sentimentTone(0.4)).toBe("up");
    expect(sentimentTone(-0.2)).toBe("down");
    expect(sentimentTone(0)).toBe("neutral");
  });
});
