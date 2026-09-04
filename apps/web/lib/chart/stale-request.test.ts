import { describe, expect, it } from "vitest";
import { createGenerationGate } from "./stale-request";

describe("stale chart fetch gate", () => {
  it("marks an older generation as stale after a newer request starts", () => {
    const gate = createGenerationGate();
    const first = gate.next();
    expect(first.isCurrent()).toBe(true);
    const second = gate.next();
    expect(first.isCurrent()).toBe(false);
    expect(second.isCurrent()).toBe(true);
    expect(first.abort.signal.aborted).toBe(true);
    expect(second.abort.signal.aborted).toBe(false);
  });
});
