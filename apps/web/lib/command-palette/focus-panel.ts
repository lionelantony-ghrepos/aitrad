import { getPanelDefinition, type PanelId } from "../panel-registry";

export type FocusableDockPanel = {
  api: { setActive: () => void };
};

export type FocusableDock = {
  getPanel: (id: string) => FocusableDockPanel | undefined;
  addPanel: (options: {
    id: PanelId;
    component: string;
    title: string;
    initialWidth: number;
    initialHeight: number;
  }) => void;
};

export function focusPanel(api: FocusableDock, panelId: PanelId): void {
  const existing = api.getPanel(panelId);
  if (existing) {
    existing.api.setActive();
    return;
  }
  const def = getPanelDefinition(panelId);
  api.addPanel({
    id: def.id,
    component: def.component,
    title: def.title,
    initialWidth: def.defaultSize.width,
    initialHeight: def.defaultSize.height,
  });
}
