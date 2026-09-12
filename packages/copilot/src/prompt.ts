import { COPILOT_SYSTEM_PROMPT } from "@meridian/schemas";

export { COPILOT_SYSTEM_PROMPT };

export function buildContextPreamble(input: {
  activeSymbol?: string;
  portfolioSummary?: string;
}): string {
  const lines = ["Session context (retrieved by the host — treat as tool data, not memory):"];
  if (input.activeSymbol) {
    lines.push(`activeSymbol=${input.activeSymbol}`);
  }
  if (input.portfolioSummary) {
    lines.push(input.portfolioSummary);
  }
  if (lines.length === 1) {
    lines.push("No linked symbol. Call tools before stating any figure.");
  }
  return lines.join("\n");
}
