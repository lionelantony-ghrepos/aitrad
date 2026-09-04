import { describe, expect, it } from "vitest";
import { COMMAND_RECENTS_KEY, loadCommandRecents, pushCommandRecent } from "./recents";

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

describe("command recents", () => {
  it("prepends unique commands and caps length", () => {
    const storage = memoryStorage();
    pushCommandRecent(storage, "GIP MSFT");
    pushCommandRecent(storage, "DES NVDA");
    pushCommandRecent(storage, "GIP MSFT");
    expect(loadCommandRecents(storage)).toEqual(["GIP MSFT", "DES NVDA"]);
    expect(storage.getItem(COMMAND_RECENTS_KEY)).toContain('"version":1');
  });

  it("ignores corrupt storage", () => {
    const storage = memoryStorage({ [COMMAND_RECENTS_KEY]: "not-json" });
    expect(loadCommandRecents(storage)).toEqual([]);
  });
});
