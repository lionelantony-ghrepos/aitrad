import { describe, expect, it } from "vitest";
import {
  DEFAULT_LAYOUT_SEQUENCE,
  PANEL_IDS,
  getPanelDefinition,
  listPanelDefinitions,
} from "./panel-registry";

describe("PanelRegistry", () => {
  it("registers the eight placeholder panels from PBI-003", () => {
    expect(
      listPanelDefinitions()
        .map((p) => p.id)
        .sort(),
    ).toEqual([...PANEL_IDS].sort());
  });

  it("exposes id, title, icon, component, and defaultSize on each entry", () => {
    expect(new Set(DEFAULT_LAYOUT_SEQUENCE.map((s) => s.id)).size).toBe(PANEL_IDS.length);

    for (const id of PANEL_IDS) {
      const def = getPanelDefinition(id);
      expect(def.id).toBe(id);
      expect(def.title.length).toBeGreaterThan(0);
      expect(def.icon.length).toBeGreaterThan(0);
      expect(def.component).toBe(id);
      expect(def.defaultSize.width).toBeGreaterThan(0);
      expect(def.defaultSize.height).toBeGreaterThan(0);
    }
  });
});
