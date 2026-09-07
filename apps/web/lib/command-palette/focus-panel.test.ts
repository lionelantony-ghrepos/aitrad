import { describe, expect, it, vi } from "vitest";
import { focusPanel } from "./focus-panel";

describe("focusPanel", () => {
  it("activates an existing panel", () => {
    const setActive = vi.fn();
    focusPanel(
      {
        getPanel: (id) => (id === "chart" ? { api: { setActive } } : undefined),
        addPanel: vi.fn(),
      },
      "chart",
    );
    expect(setActive).toHaveBeenCalledOnce();
  });

  it("adds a missing registered panel then it can be focused later", () => {
    const addPanel = vi.fn();
    focusPanel(
      {
        getPanel: () => undefined,
        addPanel,
      },
      "des",
    );
    expect(addPanel).toHaveBeenCalledWith(
      expect.objectContaining({ id: "des", component: "des", title: "Description" }),
    );
  });
});
