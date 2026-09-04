import { describe, expect, it } from "vitest";
import { fuzzyMatchInstruments } from "./fuzzy-symbol";

const universe = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "TSLA", name: "Tesla, Inc." },
];

describe("fuzzyMatchInstruments", () => {
  it("ranks an exact ticker first", () => {
    expect(fuzzyMatchInstruments("msft", universe).map((r) => r.symbol)).toEqual(["MSFT"]);
  });

  it("matches a name fragment", () => {
    expect(fuzzyMatchInstruments("micro", universe).map((r) => r.symbol)).toEqual(["MSFT"]);
  });

  it("matches a symbol prefix among several", () => {
    const hits = fuzzyMatchInstruments("n", universe).map((r) => r.symbol);
    expect(hits).toContain("NVDA");
    expect(hits[0]).toBe("NVDA");
  });

  it("returns empty for no hits", () => {
    expect(fuzzyMatchInstruments("zzzz", universe)).toEqual([]);
  });
});
