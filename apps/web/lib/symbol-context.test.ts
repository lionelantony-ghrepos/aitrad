import { describe, expect, it } from "vitest";
import { useSymbolContext } from "./symbol-context";

describe("symbolContext store (AC-007-03)", () => {
  it("sets activeSymbol via the setter", () => {
    useSymbolContext.setState({ activeSymbol: null });
    useSymbolContext.getState().setActiveSymbol("MSFT");
    expect(useSymbolContext.getState().activeSymbol).toBe("MSFT");
  });
});
