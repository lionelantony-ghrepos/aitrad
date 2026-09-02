import { describe, expect, it, vi } from "vitest";
import { applyDefaultLayout } from "./apply-default-layout";
import { PANEL_IDS } from "./panel-registry";

describe("applyDefaultLayout", () => {
  it("adds every registered panel once", () => {
    const addPanel = vi.fn();
    applyDefaultLayout({ addPanel });
    expect(addPanel).toHaveBeenCalledTimes(PANEL_IDS.length);
    const ids = addPanel.mock.calls.map((c) => c[0]?.id);
    expect(new Set(ids).size).toBe(PANEL_IDS.length);
  });
});
