import { getFunction } from "./function-router";

export type ParsedCommand =
  | { ok: true; type: "function"; code: string; arg: string | null }
  | { ok: true; type: "symbol"; query: string }
  | { ok: false; hint: string };

const TICKER = /^[A-Z][A-Z0-9.]{0,9}$/;
const SEARCHABLE = /^[A-Za-z][A-Za-z0-9.]*$/;

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, hint: "Type a function code (DES, GIP, NEWS, …) or a symbol." };
  }

  const tokens = trimmed.split(/\s+/);
  const head = tokens[0] ?? "";
  const fn = getFunction(head);

  if (fn) {
    if (fn.arg === "none") {
      if (tokens.length > 1) {
        return { ok: false, hint: `${fn.code} does not take arguments.` };
      }
      return { ok: true, type: "function", code: fn.code, arg: null };
    }
    if (fn.arg === "symbol") {
      if (tokens.length < 2) {
        return { ok: false, hint: `${fn.code} requires a symbol (e.g. ${fn.code} MSFT).` };
      }
      if (tokens.length > 2) {
        return { ok: false, hint: `${fn.code} takes a single symbol.` };
      }
      const symbol = (tokens[1] ?? "").toUpperCase();
      if (!TICKER.test(symbol)) {
        return { ok: false, hint: "Symbol looks invalid." };
      }
      return { ok: true, type: "function", code: fn.code, arg: symbol };
    }
    const queryStart = trimmed.search(/\s/);
    const query = queryStart === -1 ? "" : trimmed.slice(queryStart).trim();
    if (query.length === 0) {
      return { ok: false, hint: "AI requires a question." };
    }
    return { ok: true, type: "function", code: fn.code, arg: query };
  }

  if (tokens.length > 1) {
    return { ok: false, hint: `Unknown function ${head.toUpperCase()}.` };
  }

  if (!SEARCHABLE.test(head) || /^\d/.test(head)) {
    return { ok: false, hint: "Not a function or symbol. Try GIP MSFT or AAPL." };
  }

  return { ok: true, type: "symbol", query: head.toUpperCase() };
}
