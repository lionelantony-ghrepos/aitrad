import { describe, expect, it } from "vitest";
import { parseCommand } from "./parse-command";

describe("parseCommand TC-009-01", () => {
  const cases: Array<{
    name: string;
    input: string;
    ok: boolean;
    type?: "function" | "symbol";
    code?: string;
    arg?: string | null;
    query?: string;
  }> = [
    {
      name: "DES with symbol",
      input: "DES AAPL",
      ok: true,
      type: "function",
      code: "DES",
      arg: "AAPL",
    },
    {
      name: "GIP with symbol",
      input: "GIP MSFT",
      ok: true,
      type: "function",
      code: "GIP",
      arg: "MSFT",
    },
    {
      name: "NEWS with symbol",
      input: "NEWS TSLA",
      ok: true,
      type: "function",
      code: "NEWS",
      arg: "TSLA",
    },
    {
      name: "ORD with symbol",
      input: "ORD NVDA",
      ok: true,
      type: "function",
      code: "ORD",
      arg: "NVDA",
    },
    { name: "WL no arg", input: "WL", ok: true, type: "function", code: "WL", arg: null },
    { name: "PORT no arg", input: "PORT", ok: true, type: "function", code: "PORT", arg: null },
    { name: "SCR no arg", input: "SCR", ok: true, type: "function", code: "SCR", arg: null },
    {
      name: "AI with question",
      input: "AI hello",
      ok: true,
      type: "function",
      code: "AI",
      arg: "hello",
    },
    {
      name: "AI multi-word query",
      input: "AI what is AAPL doing",
      ok: true,
      type: "function",
      code: "AI",
      arg: "what is AAPL doing",
    },
    {
      name: "lowercase function",
      input: "gip msft",
      ok: true,
      type: "function",
      code: "GIP",
      arg: "MSFT",
    },
    {
      name: "extra whitespace",
      input: "  DES   aapl  ",
      ok: true,
      type: "function",
      code: "DES",
      arg: "AAPL",
    },
    { name: "bare ticker", input: "MSFT", ok: true, type: "symbol", query: "MSFT" },
    { name: "bare lowercase ticker", input: "aapl", ok: true, type: "symbol", query: "AAPL" },
    { name: "bare name fragment", input: "Micro", ok: true, type: "symbol", query: "MICRO" },
    { name: "empty", input: "", ok: false },
    { name: "whitespace only", input: "   ", ok: false },
    { name: "DES missing symbol", input: "DES", ok: false },
    { name: "GIP missing symbol", input: "GIP", ok: false },
    { name: "NEWS missing symbol", input: "NEWS", ok: false },
    { name: "ORD missing symbol", input: "ORD", ok: false },
    { name: "AI missing query", input: "AI", ok: false },
    { name: "AI whitespace query", input: "AI   ", ok: false },
    { name: "unknown function", input: "FOO BAR", ok: false },
    { name: "DES extra tokens", input: "DES AAPL extra", ok: false },
    { name: "WL with extra arg", input: "WL AAPL", ok: false },
    { name: "PORT with extra arg", input: "PORT 1", ok: false },
    { name: "SCR with extra arg", input: "SCR foo", ok: false },
    { name: "numeric junk", input: "12345", ok: false },
    { name: "punctuation junk", input: "!!!", ok: false },
    { name: "function-like prefix", input: "DESCRIPT AAPL", ok: false },
  ];

  it("covers at least 20 inputs", () => {
    expect(cases.length).toBeGreaterThanOrEqual(20);
  });

  it.each(cases)("$name ($input)", ({ input, ok, type, code, arg, query }) => {
    const result = parseCommand(input);
    expect(result.ok).toBe(ok);
    if (ok && type === "function" && result.ok && result.type === "function") {
      expect(result.code).toBe(code);
      expect(result.arg).toBe(arg);
    } else if (ok && type === "symbol" && result.ok && result.type === "symbol") {
      expect(result.query).toBe(query);
    } else if (!ok && !result.ok) {
      expect(result.hint.length).toBeGreaterThan(0);
    } else {
      expect(result).toMatchObject({ ok, type });
    }
  });
});
