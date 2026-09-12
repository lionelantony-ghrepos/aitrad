import {
  explainRuleDecisionToolInputSchema,
  getBarsToolInputSchema,
  getFundamentalsToolInputSchema,
  getPortfolioToolInputSchema,
  getQuoteToolInputSchema,
  screenInstrumentsToolInputSchema,
  searchNewsToolInputSchema,
  type CopilotReadToolName,
} from "@meridian/schemas";
import type { ZodType } from "zod";

export type JsonSchemaObject = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties: false;
};

export type RegisteredReadTool = {
  name: CopilotReadToolName;
  description: string;
  label: string;
  inputSchema: ZodType;
  jsonSchema: JsonSchemaObject;
};

export const READ_TOOL_LABELS: Record<CopilotReadToolName, string> = {
  get_quote: "Looking up quote…",
  get_bars: "Loading bars…",
  search_news: "Searching news…",
  get_fundamentals: "Loading fundamentals…",
  screen_instruments: "Screening instruments…",
  get_portfolio: "Loading portfolio…",
  explain_rule_decision: "Explaining rule decision…",
};

export const READ_TOOLS: readonly RegisteredReadTool[] = [
  {
    name: "get_quote",
    description: "Latest bid/ask/last/volume for a US equity or ETF symbol.",
    label: READ_TOOL_LABELS.get_quote,
    inputSchema: getQuoteToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: { symbol: { type: "string" } },
      required: ["symbol"],
      additionalProperties: false,
    },
  },
  {
    name: "get_bars",
    description: "OHLCV bars for a symbol (1D minute, otherwise daily).",
    label: READ_TOOL_LABELS.get_bars,
    inputSchema: getBarsToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        range: { type: "string", enum: ["1D", "1W", "1M", "1Y", "5Y"] },
      },
      required: ["symbol"],
      additionalProperties: false,
    },
  },
  {
    name: "search_news",
    description: "Semantic news search. Returns items with ids to cite as [news:<id>].",
    label: READ_TOOL_LABELS.search_news,
    inputSchema: searchNewsToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        symbols: { type: "array", items: { type: "string" } },
        since: { type: "string" },
        limit: { type: "integer" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "get_fundamentals",
    description: "DES fundamentals: valuation, income, margins, analyst mix.",
    label: READ_TOOL_LABELS.get_fundamentals,
    inputSchema: getFundamentalsToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: { symbol: { type: "string" } },
      required: ["symbol"],
      additionalProperties: false,
    },
  },
  {
    name: "screen_instruments",
    description: "Run the instrument screener. Prefer sector plus optional full criteria.",
    label: READ_TOOL_LABELS.screen_instruments,
    inputSchema: screenInstrumentsToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: {
        sector: { type: "string" },
        criteria: { type: "object" },
        sort: { type: "object" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_portfolio",
    description: "Paper portfolio: cash, equity, positions, P&L. Never invent these figures.",
    label: READ_TOOL_LABELS.get_portfolio,
    inputSchema: getPortfolioToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: { range: { type: "string", enum: ["1M", "3M", "1Y"] } },
      additionalProperties: false,
    },
  },
  {
    name: "explain_rule_decision",
    description: "Explain a rule_audit row (matched decision-table rows and outcome).",
    label: READ_TOOL_LABELS.explain_rule_decision,
    inputSchema: explainRuleDecisionToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: { audit_id: { type: "string" } },
      required: ["audit_id"],
      additionalProperties: false,
    },
  },
];

export function toolByName(name: string): RegisteredReadTool | undefined {
  return READ_TOOLS.find((tool) => tool.name === name);
}

export function openaiToolSpecs(): Array<{
  type: "function";
  function: { name: string; description: string; parameters: JsonSchemaObject };
}> {
  return READ_TOOLS.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.jsonSchema,
    },
  }));
}
