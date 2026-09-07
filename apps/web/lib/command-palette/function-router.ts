import type { PanelId } from "../panel-registry";

export const FUNCTION_CODES = ["DES", "GIP", "NEWS", "ORD", "WL", "PORT", "SCR", "AI"] as const;

export type FunctionCode = (typeof FUNCTION_CODES)[number];

export type FunctionArgKind = "symbol" | "query" | "none";

export type FunctionDefinition = {
  code: string;
  panelId: PanelId;
  arg: FunctionArgKind;
  title: string;
};

const DEFAULT_FUNCTIONS: FunctionDefinition[] = [
  { code: "DES", panelId: "des", arg: "symbol", title: "Description" },
  { code: "GIP", panelId: "chart", arg: "symbol", title: "Chart" },
  { code: "NEWS", panelId: "news", arg: "symbol", title: "News" },
  { code: "ORD", panelId: "orderTicket", arg: "symbol", title: "Order ticket" },
  { code: "WL", panelId: "watchlist", arg: "none", title: "Watchlist" },
  { code: "PORT", panelId: "portfolio", arg: "none", title: "Portfolio" },
  { code: "SCR", panelId: "screener", arg: "none", title: "Screener" },
  { code: "AI", panelId: "copilot", arg: "query", title: "Copilot" },
];

const registry = new Map<string, FunctionDefinition>();

function seedDefaults(): void {
  registry.clear();
  for (const def of DEFAULT_FUNCTIONS) {
    registry.set(def.code, def);
  }
}

seedDefaults();

export function resetFunctionRouter(): void {
  seedDefaults();
}

export function registerFunction(def: FunctionDefinition): void {
  registry.set(def.code.toUpperCase(), { ...def, code: def.code.toUpperCase() });
}

export function getFunction(code: string): FunctionDefinition | undefined {
  return registry.get(code.trim().toUpperCase());
}

export function listFunctions(): FunctionDefinition[] {
  return [...registry.values()];
}
