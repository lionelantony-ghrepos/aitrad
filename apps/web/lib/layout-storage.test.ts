import { describe, expect, it } from "vitest";
import {
  LAYOUT_STORAGE_KEY,
  clearStoredLayout,
  loadStoredLayout,
  persistSelectedWatchlistId,
  saveStoredLayout,
} from "./layout-storage";

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? (map.get(key) ?? null) : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("layout storage", () => {
  it("round-trips a version-1 layout", () => {
    const storage = memoryStorage();
    const layout = { version: 1 as const, dockview: { panels: { chart: {} } } };
    saveStoredLayout(storage, layout);
    expect(storage.getItem(LAYOUT_STORAGE_KEY)).toContain('"version":1');
    expect(loadStoredLayout(storage)).toEqual(layout);
  });

  it("returns null for missing, corrupt, or wrong-version data", () => {
    expect(loadStoredLayout(memoryStorage())).toBeNull();
    expect(loadStoredLayout(memoryStorage({ [LAYOUT_STORAGE_KEY]: "{" }))).toBeNull();
    expect(
      loadStoredLayout(
        memoryStorage({
          [LAYOUT_STORAGE_KEY]: JSON.stringify({ version: 2, dockview: {} }),
        }),
      ),
    ).toBeNull();
  });

  it("clearStoredLayout removes the key (reset)", () => {
    const storage = memoryStorage();
    saveStoredLayout(storage, { version: 1, dockview: {} });
    clearStoredLayout(storage);
    expect(storage.getItem(LAYOUT_STORAGE_KEY)).toBeNull();
  });

  it("persists selectedWatchlistId onto an existing layout", () => {
    const storage = memoryStorage();
    saveStoredLayout(storage, { version: 1, dockview: { panels: {} } });
    persistSelectedWatchlistId(storage, "11111111-1111-4111-8111-111111111111");
    expect(loadStoredLayout(storage)?.selectedWatchlistId).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });
});
