"use client";

import type { IDockviewPanelProps } from "dockview-react";
import { getPanelDefinition, PANEL_IDS, type PanelId } from "@/lib/panel-registry";
import { useSymbolContext } from "@/lib/symbol-context";

function isPanelId(id: string): id is PanelId {
  return (PANEL_IDS as readonly string[]).includes(id);
}

export function PlaceholderPanel(props: IDockviewPanelProps): React.JSX.Element {
  const id = props.api.id;
  const title = isPanelId(id) ? getPanelDefinition(id).title : id;
  const activeSymbol = useSymbolContext((s) => s.activeSymbol);
  const showSymbol = id === "des" || id === "news" || id === "orderTicket";
  return (
    <div
      className="flex h-full flex-col gap-1 overflow-auto bg-background p-1 text-xs text-muted-foreground"
      data-testid={`panel-${id}`}
    >
      <p>{title} placeholder</p>
      {showSymbol ? (
        <p className="font-mono text-primary" data-testid={`${id}-symbol`}>
          {activeSymbol ?? ""}
        </p>
      ) : null}
      <p className="font-mono text-up tabular-nums">+0.00</p>
      <p className="font-mono text-down tabular-nums">-0.00</p>
    </div>
  );
}
