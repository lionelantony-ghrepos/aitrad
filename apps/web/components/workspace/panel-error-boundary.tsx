"use client";

import { Component, type ReactNode } from "react";

export const CRASH_PANEL_STORAGE_KEY = "meridian.debug.crashPanel";

export function shouldCrashPanel(panelId: string): boolean {
  try {
    return globalThis.localStorage.getItem(CRASH_PANEL_STORAGE_KEY) === panelId;
  } catch {
    return false;
  }
}

export function CrashProbe({ panelId }: { panelId: string }): null {
  if (shouldCrashPanel(panelId)) {
    throw new Error(`DEV_PANEL_CRASH:${panelId}`);
  }
  return null;
}

type Props = {
  panelId: string;
  children: ReactNode;
};

type State = { error: string | null; reported: boolean };

export class PanelErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, reported: false };

  static getDerivedStateFromError(error: Error): State {
    return { error: error.message, reported: false };
  }

  override componentDidCatch(error: Error): void {
    void fetch("/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        op: "client_error",
        panel_id: this.props.panelId,
        message: error.message,
        stack: error.stack,
      }),
    })
      .then((res) => {
        if (res.ok) {
          this.setState({ reported: true });
        }
      })
      .catch(() => undefined);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          className="flex h-full flex-col gap-1 bg-background p-2 text-xs text-destructive"
          data-testid={`panel-${this.props.panelId}-error`}
        >
          <p>Panel crashed.</p>
          <p className="font-mono text-muted-foreground">{this.state.error}</p>
          {this.state.reported ? <p data-testid="panel-error-reported">Error reported</p> : null}
        </div>
      );
    }
    return this.props.children;
  }
}
