"use client";

import type { IDockviewPanelProps } from "dockview-react";
import type { PanelId } from "@/lib/panel-registry";
import { CrashProbe, PanelErrorBoundary } from "./panel-error-boundary";
import { StaleWatermark } from "@/lib/observability/stale-watermark";

export function wrapPanel(
  panelId: PanelId,
  Component: (props: IDockviewPanelProps) => React.JSX.Element,
): (props: IDockviewPanelProps) => React.JSX.Element {
  function Wrapped(props: IDockviewPanelProps): React.JSX.Element {
    return (
      <PanelErrorBoundary panelId={panelId}>
        <div className="relative h-full min-h-0" data-testid={`panel-frame-${panelId}`}>
          <CrashProbe panelId={panelId} />
          <StaleWatermark />
          <Component {...props} />
        </div>
      </PanelErrorBoundary>
    );
  }
  Wrapped.displayName = `PanelShell(${panelId})`;
  return Wrapped;
}
