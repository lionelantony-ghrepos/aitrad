import { describe, expect, it } from "vitest";
import { resolveCommand } from "./resolve-command";

const instruments = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "TSLA", name: "Tesla, Inc." },
];

describe("resolveCommand", () => {
  it("maps GIP MSFT to the chart panel and symbol", () => {
    const result = resolveCommand("GIP MSFT", instruments);
    expect(result).toEqual({
      ok: true,
      panelId: "chart",
      symbol: "MSFT",
      copilotQuery: null,
      recent: "GIP MSFT",
    });
  });

  it("maps DES NVDA to the description panel", () => {
    const result = resolveCommand("DES NVDA", instruments);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.panelId).toBe("des");
      expect(result.symbol).toBe("NVDA");
    }
  });

  it("maps NEWS TSLA to news with symbol context", () => {
    const result = resolveCommand("NEWS TSLA", instruments);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.panelId).toBe("news");
      expect(result.symbol).toBe("TSLA");
    }
  });

  it("maps AI hello to copilot input", () => {
    const result = resolveCommand("AI hello", instruments);
    expect(result).toEqual({
      ok: true,
      panelId: "copilot",
      symbol: null,
      copilotQuery: "hello",
      recent: "AI hello",
    });
  });

  it("maps a bare ticker to chart + symbol", () => {
    const result = resolveCommand("AAPL", instruments);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.panelId).toBe("chart");
      expect(result.symbol).toBe("AAPL");
    }
  });

  it("hints on unknown symbol", () => {
    const result = resolveCommand("GIP ZZQQ", instruments);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.hint.toLowerCase()).toMatch(/symbol|unknown/);
    }
  });

  it("hints on bad grammar without throwing", () => {
    const result = resolveCommand("DES", instruments);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.hint.length).toBeGreaterThan(0);
    }
  });
});
