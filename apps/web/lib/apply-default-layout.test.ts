import { describe, expect, it, vi } from "vitest";
import { applyDefaultLayout } from "./apply-default-layout";
import { DEFAULT_LAYOUT_SEQUENCE } from "./panel-registry";

describe("applyDefaultLayout", () => {
  it("adds every default-layout panel once", () => {
    const addPanel = vi.fn();
    applyDefaultLayout({ addPanel });
    expect(addPanel).toHaveBeenCalledTimes(DEFAULT_LAYOUT_SEQUENCE.length);
    const ids = addPanel.mock.calls.map((c) => c[0]?.id);
    expect(new Set(ids).size).toBe(DEFAULT_LAYOUT_SEQUENCE.length);
  });
});
