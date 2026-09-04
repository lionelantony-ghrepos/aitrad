import { fuzzyMatchInstruments, type NamedInstrument } from "./fuzzy-symbol";
import { getFunction } from "./function-router";
import { parseCommand } from "./parse-command";
import type { PanelId } from "../panel-registry";

export type ResolveOk = {
  ok: true;
  panelId: PanelId;
  symbol: string | null;
  copilotQuery: string | null;
  recent: string;
};

export type ResolveErr = { ok: false; hint: string };

export type ResolveResult = ResolveOk | ResolveErr;

function pickSymbol(query: string, instruments: readonly NamedInstrument[]): string | null {
  const hits = fuzzyMatchInstruments(query, instruments);
  const exact = hits.find((row) => row.symbol.toUpperCase() === query.toUpperCase());
  if (exact) {
    return exact.symbol;
  }
  if (hits.length === 1) {
    return hits[0]?.symbol ?? null;
  }
  return null;
}

export function resolveCommand(
  input: string,
  instruments: readonly NamedInstrument[],
): ResolveResult {
  const parsed = parseCommand(input);
  if (!parsed.ok) {
    return { ok: false, hint: parsed.hint };
  }

  if (parsed.type === "symbol") {
    const symbol = pickSymbol(parsed.query, instruments);
    if (!symbol) {
      return { ok: false, hint: `Unknown symbol ${parsed.query}.` };
    }
    return { ok: true, panelId: "chart", symbol, copilotQuery: null, recent: symbol };
  }

  const fn = getFunction(parsed.code);
  if (!fn) {
    return { ok: false, hint: `Unknown function ${parsed.code}.` };
  }

  if (fn.arg === "none") {
    return { ok: true, panelId: fn.panelId, symbol: null, copilotQuery: null, recent: fn.code };
  }

  if (fn.arg === "query") {
    return {
      ok: true,
      panelId: fn.panelId,
      symbol: null,
      copilotQuery: parsed.arg,
      recent: `${fn.code} ${parsed.arg ?? ""}`.trim(),
    };
  }

  const arg = parsed.arg ?? "";
  const symbol = pickSymbol(arg, instruments);
  if (!symbol) {
    return { ok: false, hint: `Unknown symbol ${arg}.` };
  }
  return {
    ok: true,
    panelId: fn.panelId,
    symbol,
    copilotQuery: null,
    recent: `${fn.code} ${symbol}`,
  };
}
