import { describe, expect, it } from "vitest";
import {
  CRASH_PANEL_STORAGE_KEY,
  shouldCrashPanel,
} from "@/components/workspace/panel-error-boundary";

describe("TC-030-01 panel crash hook", () => {
  it("throws only for the targeted panel id", () => {
    const store = new Map<string, string>();
    const orig = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
      },
    });
    store.set(CRASH_PANEL_STORAGE_KEY, "watchlist");
    expect(shouldCrashPanel("watchlist")).toBe(true);
    expect(shouldCrashPanel("chart")).toBe(false);
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: orig });
  });
});
