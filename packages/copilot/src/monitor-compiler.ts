import {
  compiledMonitorConditionSchema,
  monitorCompileResultSchema,
  monitorScopeSchema,
  type CompiledMonitorCondition,
  type MonitorCompileResult,
  type MonitorScope,
} from "@meridian/schemas";

const SECTOR_ALIASES: Record<string, string> = {
  semis: "semiconductors",
  semiconductor: "semiconductors",
  semiconductors: "semiconductors",
  energy: "energy",
  tech: "technology",
  technology: "technology",
  healthcare: "healthcare",
  financials: "financials",
};

function fireRow(
  input: string,
  op: CompiledMonitorCondition["conditions"][number]["op"],
  value: unknown,
): CompiledMonitorCondition {
  return compiledMonitorConditionSchema.parse({
    id: "monitor",
    priority: 1,
    conditions: [{ input, op, value }],
    outputs: { decision: "fire" },
  });
}

function result(input: {
  name: string;
  scope: MonitorScope;
  compiled_condition: CompiledMonitorCondition;
  cadence?: MonitorCompileResult["cadence"];
}): MonitorCompileResult {
  return monitorCompileResultSchema.parse({
    name: input.name,
    cadence: input.cadence ?? "5m",
    scope: monitorScopeSchema.parse(input.scope),
    compiled_condition: input.compiled_condition,
    propose_action: null,
  });
}

export function normalizeMonitorInstruction(nl: string): string {
  return nl
    .trim()
    .replace(/^(please\s+)?(create\s+a\s+)?monitor[:\s-]+/i, "")
    .trim();
}

/**
 * Deterministic compiler for canned NL. Live path tries this first, then LLM+Zod.
 * Thresholds come from the instruction text (user-supplied), not policy tables.
 */
export function compileMonitorInstruction(nlInstruction: string): MonitorCompileResult | null {
  const nl = normalizeMonitorInstruction(nlInstruction);
  if (nl.length === 0) {
    return null;
  }

  const positionDrop = nl.match(/any position drops?\s+(\d+(?:\.\d+)?)%/i);
  if (positionDrop?.[1]) {
    const pct = Number(positionDrop[1]);
    return result({
      name: `Position day drop ${pct}%`,
      scope: { kind: "portfolio" },
      compiled_condition: fireRow("position_day_pct", "lte", -pct),
    });
  }

  const myPositionsNews = /watch my positions for negative news/i.test(nl);
  if (myPositionsNews) {
    return result({
      name: "Positions negative news",
      scope: { kind: "portfolio" },
      compiled_condition: fireRow("news_sentiment", "lt", 0),
    });
  }

  const sectorNews = nl.match(/watch\s+(\w+)(?:\s+sector)?\s+for negative news/i);
  if (sectorNews?.[1]) {
    const alias = sectorNews[1].toLowerCase();
    const sector = SECTOR_ALIASES[alias];
    if (sector) {
      return result({
        name: `${sector} negative news`,
        scope: { kind: "sector", sector },
        compiled_condition: fireRow("news_sentiment", "lt", 0),
      });
    }
  }

  const portfolioDown = nl.match(/portfolio is down\s+(\d+(?:\.\d+)?)%/i);
  if (portfolioDown?.[1]) {
    const pct = Number(portfolioDown[1]);
    return result({
      name: `Portfolio day drop ${pct}%`,
      scope: { kind: "portfolio" },
      compiled_condition: fireRow("portfolio_day_pct", "lte", -pct),
    });
  }

  const sectorDrop = nl.match(/watch\s+(\w+)\s+sector for drops? of\s+(\d+(?:\.\d+)?)%/i);
  if (sectorDrop?.[1] && sectorDrop[2]) {
    const alias = sectorDrop[1].toLowerCase();
    const sector = SECTOR_ALIASES[alias] ?? alias;
    const pct = Number(sectorDrop[2]);
    return result({
      name: `${sector} drop ${pct}%`,
      scope: { kind: "sector", sector },
      compiled_condition: fireRow("pct_chg", "lte", -pct),
    });
  }

  const lastAbove = nl.match(/watch\s+([A-Za-z]{1,5})\s+if last rises above\s+(\d+(?:\.\d+)?)/i);
  if (lastAbove?.[1] && lastAbove[2]) {
    const symbol = lastAbove[1].toUpperCase();
    const px = Number(lastAbove[2]);
    return result({
      name: `${symbol} last above ${px}`,
      scope: { kind: "symbols", symbols: [symbol] },
      compiled_condition: fireRow("last", "gte", px),
    });
  }

  const volumeAbove = nl.match(/watch\s+([A-Za-z]{1,5})\s+volume above\s+(\d+)/i);
  if (volumeAbove?.[1] && volumeAbove[2]) {
    const symbol = volumeAbove[1].toUpperCase();
    const volume = Number(volumeAbove[2]);
    return result({
      name: `${symbol} volume`,
      scope: { kind: "symbols", symbols: [symbol] },
      compiled_condition: fireRow("volume", "gt", volume),
    });
  }

  const rsiBelow = nl.match(/\b([A-Za-z]{1,5})\b RSI goes below\s+(\d+(?:\.\d+)?)/i);
  if (rsiBelow?.[1] && rsiBelow[2]) {
    const symbol = rsiBelow[1].toUpperCase();
    const rsi = Number(rsiBelow[2]);
    return result({
      name: `${symbol} RSI`,
      scope: { kind: "symbols", symbols: [symbol] },
      compiled_condition: fireRow("rsi_14", "lt", rsi),
    });
  }

  const isUp = nl.match(/when\s+([A-Za-z]{1,5})\s+is up\s+(\d+(?:\.\d+)?)%/i);
  if (isUp?.[1] && isUp[2]) {
    const symbol = isUp[1].toUpperCase();
    const pct = Number(isUp[2]);
    return result({
      name: `${symbol} up ${pct}%`,
      scope: { kind: "symbols", symbols: [symbol] },
      compiled_condition: fireRow("pct_chg", "gte", pct),
    });
  }

  const symbolDrop = nl.match(/\b([A-Za-z]{1,5})\b drops?\s+(\d+(?:\.\d+)?)%/i);
  if (symbolDrop?.[1] && symbolDrop[2]) {
    const symbol = symbolDrop[1].toUpperCase();
    const pct = Number(symbolDrop[2]);
    return result({
      name: `${symbol} drop ${pct}%`,
      scope: { kind: "symbols", symbols: [symbol] },
      compiled_condition: fireRow("pct_chg", "lte", -pct),
    });
  }

  return null;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("MONITOR_COMPILE_NOT_JSON");
  }
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
}

export async function compileMonitorInstructionWithLlm(input: {
  nl_instruction: string;
  completeJson: (prompt: string) => Promise<string>;
}): Promise<MonitorCompileResult> {
  const canned = compileMonitorInstruction(input.nl_instruction);
  if (canned) {
    return canned;
  }
  const basePrompt = [
    "Compile this Meridian monitor instruction into JSON only.",
    "Schema: { name?, cadence?: 5m|15m|1h|1d, scope: { kind: symbols|sector|portfolio, symbols?: string[], sector?: string }, compiled_condition: { id, priority, conditions: [{ input, op, value }], outputs: { decision: 'fire' } }, propose_action?: object|null }.",
    `Allowed condition inputs: position_day_pct, portfolio_day_pct, pct_chg, last, volume, rsi_14, news_sentiment.`,
    `Instruction: ${input.nl_instruction}`,
  ].join("\n");
  let raw = await input.completeJson(basePrompt);
  let parsed = tryParseCompile(raw);
  if (!parsed.ok) {
    raw = await input.completeJson(
      `${basePrompt}\nPrevious JSON failed validation: ${parsed.error}\nReturn corrected JSON only.`,
    );
    parsed = tryParseCompile(raw);
  }
  if (!parsed.ok) {
    throw new Error(`MONITOR_COMPILE_INVALID:${parsed.error}`);
  }
  return parsed.value;
}

function tryParseCompile(
  raw: string,
): { ok: true; value: MonitorCompileResult } | { ok: false; error: string } {
  try {
    const json = extractJsonObject(raw);
    return { ok: true, value: monitorCompileResultSchema.parse(json) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "PARSE" };
  }
}
