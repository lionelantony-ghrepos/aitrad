import {
  createAlertToolInputSchema,
  createMonitorToolInputSchema,
  createWatchlistItemToolInputSchema,
  explainRuleDecisionToolInputSchema,
  getBarsToolInputSchema,
  getFundamentalsToolInputSchema,
  getPortfolioToolInputSchema,
  getQuoteToolInputSchema,
  proposeOrderToolInputSchema,
  screenInstrumentsToolInputSchema,
  searchNewsToolInputSchema,
  type CopilotReadToolName,
  type CopilotWriteToolName,
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

export type RegisteredWriteTool = {
  name: CopilotWriteToolName;
  description: string;
  label: string;
  inputSchema: ZodType;
  jsonSchema: JsonSchemaObject;
};

export type RegisteredTool = RegisteredReadTool | RegisteredWriteTool;

export const READ_TOOL_LABELS: Record<CopilotReadToolName, string> = {
  get_quote: "Looking up quote…",
  get_bars: "Loading bars…",
  search_news: "Searching news…",
  get_fundamentals: "Loading fundamentals…",
  screen_instruments: "Screening instruments…",
  get_portfolio: "Loading portfolio…",
  explain_rule_decision: "Explaining rule decision…",
};

export const WRITE_TOOL_LABELS: Record<CopilotWriteToolName, string> = {
  create_watchlist_item: "Adding to watchlist…",
  create_alert: "Creating alert…",
  propose_order: "Proposing order…",
  create_monitor: "Creating monitor…",
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

export const WRITE_TOOLS: readonly RegisteredWriteTool[] = [
  {
    name: "create_watchlist_item",
    description: "Add a symbol to the user's watchlist. May auto-execute per AI action policy.",
    label: WRITE_TOOL_LABELS.create_watchlist_item,
    inputSchema: createWatchlistItemToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        watchlist_id: { type: "string" },
      },
      required: ["symbol"],
      additionalProperties: false,
    },
  },
  {
    name: "create_alert",
    description: "Create a price or news alert. May auto-execute per AI action policy.",
    label: WRITE_TOOL_LABELS.create_alert,
    inputSchema: createAlertToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        kind: {
          type: "string",
          enum: [
            "price_cross_above",
            "price_cross_below",
            "pct_chg",
            "volume",
            "rsi",
            "news_sentiment",
          ],
        },
        threshold: { type: "number" },
        name: { type: "string" },
      },
      required: ["symbol", "kind"],
      additionalProperties: false,
    },
  },
  {
    name: "propose_order",
    description:
      "Propose a paper order. Orders always require explicit user approval before order-service.",
    label: WRITE_TOOL_LABELS.propose_order,
    inputSchema: proposeOrderToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        side: { type: "string", enum: ["buy", "sell"] },
        qty: { type: "number" },
        order_type: { type: "string", enum: ["market", "limit", "stop", "stop_limit"] },
        limit_price: { type: "number" },
        stop_price: { type: "number" },
        tif: { type: "string", enum: ["DAY", "GTC", "IOC"] },
        last_price: { type: "number" },
      },
      required: ["symbol", "side", "qty"],
      additionalProperties: false,
    },
  },
  {
    name: "create_monitor",
    description:
      "Record a standing monitor instruction. Compilation/runner land in a later PBI; policy still applies.",
    label: WRITE_TOOL_LABELS.create_monitor,
    inputSchema: createMonitorToolInputSchema,
    jsonSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        nl_instruction: { type: "string" },
        symbols: { type: "array", items: { type: "string" } },
      },
      required: ["nl_instruction"],
      additionalProperties: false,
    },
  },
];

export function isWriteTool(name: string): name is CopilotWriteToolName {
  return WRITE_TOOLS.some((tool) => tool.name === name);
}

export function toolByName(name: string): RegisteredTool | undefined {
  return (
    READ_TOOLS.find((tool) => tool.name === name) ?? WRITE_TOOLS.find((tool) => tool.name === name)
  );
}

export function openaiToolSpecs(): Array<{
  type: "function";
  function: { name: string; description: string; parameters: JsonSchemaObject };
}> {
  return [...READ_TOOLS, ...WRITE_TOOLS].map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.jsonSchema,
    },
  }));
}
