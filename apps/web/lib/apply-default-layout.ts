import { DEFAULT_LAYOUT_SEQUENCE, getPanelDefinition, type PanelId } from "./panel-registry";

export type DefaultLayoutApi = {
  addPanel: (options: {
    id: PanelId;
    component: string;
    title: string;
    initialWidth: number;
    initialHeight: number;
    position?: { referencePanel: PanelId; direction: "left" | "right" | "above" | "below" };
  }) => void;
};

export function applyDefaultLayout(api: DefaultLayoutApi): void {
  for (const step of DEFAULT_LAYOUT_SEQUENCE) {
    const def = getPanelDefinition(step.id);
    api.addPanel({
      id: def.id,
      component: def.component,
      title: def.title,
      initialWidth: def.defaultSize.width,
      initialHeight: def.defaultSize.height,
      position: step.position,
    });
  }
}
