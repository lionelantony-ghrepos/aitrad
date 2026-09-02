import { describe, expect, it } from "vitest";
import { isPaletteHotkey } from "./palette-hotkey";

describe("isPaletteHotkey", () => {
  it("matches Ctrl+K", () => {
    expect(isPaletteHotkey({ key: "k", ctrlKey: true, metaKey: false })).toBe(true);
  });

  it("matches Meta+K (mac)", () => {
    expect(isPaletteHotkey({ key: "k", ctrlKey: false, metaKey: true })).toBe(true);
  });

  it("ignores other chords", () => {
    expect(isPaletteHotkey({ key: "k", ctrlKey: false, metaKey: false })).toBe(false);
    expect(isPaletteHotkey({ key: "p", ctrlKey: true, metaKey: false })).toBe(false);
  });
});
