export const COPILOT_SLASH_SUGGESTIONS = [
  { command: "/quote", hint: "Latest print for the linked symbol" },
  { command: "/news", hint: "Search news (cite sources)" },
  { command: "/bars", hint: "Load recent bars" },
  { command: "/des", hint: "Fundamentals snapshot" },
  { command: "/screen", hint: "Screen a sector" },
  { command: "/portfolio", hint: "Paper book summary" },
  { command: "/explain", hint: "Explain a rule_audit id" },
] as const;

export function expandSlashPrompt(input: string, activeSymbol?: string): string {
  const trimmed = input.trim();
  const symbol = activeSymbol ?? "the linked symbol";
  const [cmd, ...rest] = trimmed.split(/\s+/);
  const arg = rest.join(" ");
  switch (cmd) {
    case "/quote":
      return `What is the latest quote for ${arg || symbol}? Use get_quote.`;
    case "/news":
      return `Summarize recent news for ${arg || symbol}. Use search_news and cite [news:id].`;
    case "/bars":
      return `Describe recent bars for ${arg || symbol}. Use get_bars.`;
    case "/des":
      return `Summarize fundamentals for ${arg || symbol}. Use get_fundamentals and cite [des:SYMBOL].`;
    case "/screen":
      return `Screen instruments${arg ? ` in ${arg}` : ""}. Use screen_instruments.`;
    case "/portfolio":
      return "Summarize my paper portfolio. Use get_portfolio. Do not invent P&L.";
    case "/explain":
      return arg
        ? `Explain rule decision ${arg} using explain_rule_decision.`
        : "Ask for a rule_audit id to explain.";
    default:
      return trimmed;
  }
}

export function matchingSlashSuggestions(input: string): Array<{ command: string; hint: string }> {
  if (!input.startsWith("/")) {
    return [];
  }
  const needle = input.toLowerCase();
  return COPILOT_SLASH_SUGGESTIONS.filter((row) => row.command.startsWith(needle));
}
