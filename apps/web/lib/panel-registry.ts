export const PANEL_IDS = [
  "chart",
  "watchlist",
  "orderTicket",
  "blotter",
  "news",
  "screener",
  "portfolio",
  "copilot",
] as const;

export type PanelId = (typeof PANEL_IDS)[number];

export type PanelDefinition = {
  id: PanelId;
  title: string;
  icon: string;
  component: PanelId;
  defaultSize: { width: number; height: number };
};

const REGISTRY: Record<PanelId, PanelDefinition> = {
  chart: {
    id: "chart",
    title: "Chart",
    icon: "candlestick-chart",
    component: "chart",
    defaultSize: { width: 720, height: 420 },
  },
  watchlist: {
    id: "watchlist",
    title: "Watchlist",
    icon: "list",
    component: "watchlist",
    defaultSize: { width: 280, height: 420 },
  },
  orderTicket: {
    id: "orderTicket",
    title: "Order ticket",
    icon: "ticket",
    component: "orderTicket",
    defaultSize: { width: 320, height: 280 },
  },
  blotter: {
    id: "blotter",
    title: "Blotter",
    icon: "table",
    component: "blotter",
    defaultSize: { width: 640, height: 240 },
  },
  news: {
    id: "news",
    title: "News",
    icon: "newspaper",
    component: "news",
    defaultSize: { width: 320, height: 280 },
  },
  screener: {
    id: "screener",
    title: "Screener",
    icon: "filter",
    component: "screener",
    defaultSize: { width: 400, height: 320 },
  },
  portfolio: {
    id: "portfolio",
    title: "Portfolio",
    icon: "pie-chart",
    component: "portfolio",
    defaultSize: { width: 400, height: 280 },
  },
  copilot: {
    id: "copilot",
    title: "Copilot",
    icon: "sparkles",
    component: "copilot",
    defaultSize: { width: 360, height: 360 },
  },
};

export function listPanelDefinitions(): PanelDefinition[] {
  return PANEL_IDS.map((id) => REGISTRY[id]);
}

export function getPanelDefinition(id: PanelId): PanelDefinition {
  return REGISTRY[id];
}

export type DefaultLayoutStep = {
  id: PanelId;
  position?: { referencePanel: PanelId; direction: "left" | "right" | "above" | "below" };
};

/** Deterministic default dock order for Reset layout. */
export const DEFAULT_LAYOUT_SEQUENCE: DefaultLayoutStep[] = [
  { id: "chart" },
  { id: "watchlist", position: { referencePanel: "chart", direction: "left" } },
  { id: "news", position: { referencePanel: "chart", direction: "right" } },
  { id: "blotter", position: { referencePanel: "chart", direction: "below" } },
  { id: "orderTicket", position: { referencePanel: "blotter", direction: "right" } },
  { id: "portfolio", position: { referencePanel: "news", direction: "below" } },
  { id: "screener", position: { referencePanel: "portfolio", direction: "below" } },
  { id: "copilot", position: { referencePanel: "orderTicket", direction: "right" } },
];
