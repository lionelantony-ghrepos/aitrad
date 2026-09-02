"use client";

import { useCallback } from "react";
import {
  DockviewReact,
  themeDark,
  type DockviewApi,
  type DockviewReadyEvent,
} from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { applyDefaultLayout } from "@/lib/apply-default-layout";
import { clearStoredLayout, loadStoredLayout, saveStoredLayout } from "@/lib/layout-storage";
import { PANEL_IDS } from "@/lib/panel-registry";
import { PlaceholderPanel } from "./placeholder-panel";

const components = Object.fromEntries(PANEL_IDS.map((id) => [id, PlaceholderPanel]));

function snapshot(api: DockviewApi): Record<string, unknown> {
  return JSON.parse(JSON.stringify(api.toJSON())) as Record<string, unknown>;
}

function persist(api: DockviewApi): void {
  saveStoredLayout(window.localStorage, { version: 1, dockview: snapshot(api) });
}

export function resetDockLayout(api: DockviewApi): void {
  clearStoredLayout(window.localStorage);
  api.clear();
  applyDefaultLayout(api);
  persist(api);
}

type DockWorkspaceProps = {
  onApiReady: (api: DockviewApi) => void;
};

export function DockWorkspace({ onApiReady }: DockWorkspaceProps): React.JSX.Element {
  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      const { api } = event;
      const stored = loadStoredLayout(window.localStorage);
      if (stored) {
        try {
          api.fromJSON(stored.dockview as unknown as Parameters<DockviewApi["fromJSON"]>[0]);
        } catch {
          applyDefaultLayout(api);
        }
      } else {
        applyDefaultLayout(api);
      }
      api.onDidLayoutChange(() => {
        persist(api);
      });
      persist(api);
      onApiReady(api);
    },
    [onApiReady],
  );

  return (
    <DockviewReact
      className="h-full w-full"
      components={components}
      onReady={onReady}
      theme={themeDark}
    />
  );
}
