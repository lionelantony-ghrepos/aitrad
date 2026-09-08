"use client";

import { useCallback, useEffect, useState } from "react";
import type { DockviewApi } from "dockview-react";
import { focusPanel } from "@/lib/command-palette/focus-panel";
import { useOrderTicketIntent } from "@/lib/order-ticket/intent";
import { isPaletteHotkey } from "@/lib/palette-hotkey";
import { useSymbolContext } from "@/lib/symbol-context";
import { WorkspaceRuntimeContext } from "@/lib/workspace-runtime";
import { CommandBar } from "./command-bar";
import { CommandPalette } from "./command-palette";
import { DockWorkspace, resetDockLayout } from "./dock-workspace";
import { StatusBar } from "./status-bar";

type WorkspaceShellProps = {
  email: string;
  cashLabel: string | null;
  accountCount: number;
  e2eFeed: boolean;
};

export function WorkspaceShell({
  email,
  cashLabel,
  accountCount,
  e2eFeed,
}: WorkspaceShellProps): React.JSX.Element {
  const [api, setApi] = useState<DockviewApi | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [focusedPanel, setFocusedPanel] = useState("");
  const activeSymbol = useSymbolContext((s) => s.activeSymbol);
  const setTicketSide = useOrderTicketIntent((s) => s.setSide);

  const openPalette = useCallback(() => {
    setPaletteOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (isPaletteHotkey(e)) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (paletteOpen || e.ctrlKey || e.metaKey || e.altKey || !e.shiftKey) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key !== "b" && key !== "s") {
        return;
      }
      e.preventDefault();
      setTicketSide(key === "b" ? "buy" : "sell");
      if (api) {
        focusPanel(api, "orderTicket");
        setFocusedPanel("orderTicket");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [api, paletteOpen, setTicketSide]);

  return (
    <WorkspaceRuntimeContext.Provider value={{ e2eFeed, dockApi: api }}>
      <div
        className="flex h-screen flex-col bg-background text-foreground"
        data-testid="workspace"
        data-e2e-feed={e2eFeed ? "1" : "0"}
      >
        <CommandBar
          email={email}
          cashLabel={cashLabel}
          onOpenPalette={openPalette}
          onResetLayout={() => {
            if (api) {
              resetDockLayout(api);
            }
          }}
        />
        <span className="sr-only" data-testid="account-count">
          {accountCount}
        </span>
        <span className="sr-only" data-testid="symbol-context-readout">
          {activeSymbol ?? ""}
        </span>
        <span className="sr-only" data-testid="focused-panel">
          {focusedPanel}
        </span>
        <div className="min-h-0 w-full flex-1" style={{ height: "calc(100vh - 3.5rem)" }}>
          <DockWorkspace onApiReady={setApi} />
        </div>
        <StatusBar connection="live" />
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onRouted={setFocusedPanel}
        />
      </div>
    </WorkspaceRuntimeContext.Provider>
  );
}
