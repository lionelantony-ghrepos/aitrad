"use client";

import { useCallback, useEffect, useState } from "react";
import type { DockviewApi } from "dockview-react";
import { isPaletteHotkey } from "@/lib/palette-hotkey";
import { CommandBar } from "./command-bar";
import { CommandPalette } from "./command-palette";
import { DockWorkspace, resetDockLayout } from "./dock-workspace";
import { StatusBar } from "./status-bar";

export function WorkspaceShell(): React.JSX.Element {
  const [api, setApi] = useState<DockviewApi | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const openPalette = useCallback(() => {
    setPaletteOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!isPaletteHotkey(e)) {
        return;
      }
      e.preventDefault();
      setPaletteOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground" data-testid="workspace">
      <CommandBar
        onOpenPalette={openPalette}
        onResetLayout={() => {
          if (api) {
            resetDockLayout(api);
          }
        }}
      />
      <div className="min-h-0 w-full flex-1" style={{ height: "calc(100vh - 3.5rem)" }}>
        <DockWorkspace onApiReady={setApi} />
      </div>
      <StatusBar connection="live" />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
