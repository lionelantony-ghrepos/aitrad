import { afterEach, describe, expect, it } from "vitest";
import {
  FUNCTION_CODES,
  getFunction,
  listFunctions,
  registerFunction,
  resetFunctionRouter,
} from "./function-router";

describe("FunctionRouter", () => {
  afterEach(() => {
    resetFunctionRouter();
  });

  it("registers the v1 function codes with panel mappings", () => {
    const byCode = Object.fromEntries(listFunctions().map((fn) => [fn.code, fn]));
    expect(FUNCTION_CODES).toEqual(["DES", "GIP", "NEWS", "ORD", "WL", "PORT", "SCR", "AI"]);
    expect(byCode.DES?.panelId).toBe("des");
    expect(byCode.GIP?.panelId).toBe("chart");
    expect(byCode.NEWS?.panelId).toBe("news");
    expect(byCode.ORD?.panelId).toBe("orderTicket");
    expect(byCode.WL?.panelId).toBe("watchlist");
    expect(byCode.PORT?.panelId).toBe("portfolio");
    expect(byCode.SCR?.panelId).toBe("screener");
    expect(byCode.AI?.panelId).toBe("copilot");
    expect(byCode.DES?.arg).toBe("symbol");
    expect(byCode.AI?.arg).toBe("query");
    expect(byCode.WL?.arg).toBe("none");
  });

  it("lets later PBIs register a function declaratively", () => {
    registerFunction({
      code: "WEI",
      panelId: "screener",
      arg: "none",
      title: "World equity indices",
    });
    expect(getFunction("wei")?.code).toBe("WEI");
    expect(getFunction("WEI")?.panelId).toBe("screener");
  });
});
