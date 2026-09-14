import type { CompiledMonitorCondition, MonitorScope } from "@meridian/schemas";

const OP_WORDS: Record<string, string> = {
  eq: "equals",
  neq: "does not equal",
  lt: "is less than",
  lte: "is at most",
  gt: "is greater than",
  gte: "is at least",
  in: "is in",
  not_in: "is not in",
  between: "is between",
  regex: "matches",
  is_null: "is empty",
  any: "is anything",
};

const FACT_WORDS: Record<string, string> = {
  position_day_pct: "any position day change (%)",
  portfolio_day_pct: "portfolio day change (%)",
  pct_chg: "day percent change",
  last: "last price",
  volume: "volume",
  rsi_14: "RSI(14)",
  news_sentiment: "news sentiment",
};

export function explainMonitorScope(scope: MonitorScope): string {
  if (scope.kind === "portfolio") {
    return "your portfolio";
  }
  if (scope.kind === "sector") {
    return `the ${scope.sector ?? "named"} sector`;
  }
  const symbols = (scope.symbols ?? []).map((row) => row.toUpperCase()).join(", ");
  return symbols.length > 0 ? symbols : "selected symbols";
}

export function explainCompiledMonitor(
  condition: CompiledMonitorCondition,
  scope: MonitorScope,
): string {
  const clauses = condition.conditions.map((cell) => {
    const fact = FACT_WORDS[cell.input] ?? cell.input;
    const op = OP_WORDS[cell.op] ?? cell.op;
    const value = cell.value === undefined ? "" : ` ${String(cell.value)}`;
    return `${fact} ${op}${value}`;
  });
  return `Watches ${explainMonitorScope(scope)}. Fires when ${clauses.join(" and ")}.`;
}

export function groundedMonitorExplanation(input: {
  name: string;
  nl_instruction: string;
  facts: Record<string, unknown>;
  cited: string[];
}): string {
  const worst = input.facts.position_day_pct;
  const portfolio = input.facts.portfolio_day_pct;
  const pct = input.facts.pct_chg;
  const last = input.facts.last;
  const sentiment = input.facts.news_sentiment;
  const symbol = typeof input.facts.symbol === "string" ? input.facts.symbol : null;
  const bits: string[] = [];
  if (typeof worst === "number") {
    bits.push(`Worst position day change is ${worst}%.`);
  } else if (typeof portfolio === "number") {
    bits.push(`Portfolio day change is ${portfolio}%.`);
  } else if (symbol && typeof pct === "number") {
    bits.push(
      `${symbol} day change is ${pct}%${typeof last === "number" ? ` at last ${last}` : ""}.`,
    );
  } else if (typeof sentiment === "number") {
    bits.push(`News sentiment is ${sentiment}.`);
  } else {
    bits.push("Monitor facts matched the compiled condition.");
  }
  const cite = input.cited.length > 0 ? ` Cited ${input.cited.join(", ")}.` : "";
  bits.push(`This matches “${input.nl_instruction}” (${input.name}).${cite}`.trim());
  return bits.slice(0, 2).join(" ");
}
