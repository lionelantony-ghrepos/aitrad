"use client";

import { Command } from "cmdk";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Instrument } from "@meridian/schemas";
import { searchInstrumentsAction } from "@/app/actions/watchlists";
import { focusPanel } from "@/lib/command-palette/focus-panel";
import { getFunction } from "@/lib/command-palette/function-router";
import { fuzzyMatchInstruments } from "@/lib/command-palette/fuzzy-symbol";
import { parseCommand } from "@/lib/command-palette/parse-command";
import { loadCommandRecents, pushCommandRecent } from "@/lib/command-palette/recents";
import { resolveCommand } from "@/lib/command-palette/resolve-command";
import { useCopilotDraft } from "@/lib/copilot-draft";
import { useSymbolContext } from "@/lib/symbol-context";
import { useWorkspaceRuntime } from "@/lib/workspace-runtime";

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onRouted?: (panelId: string) => void;
};

type PaletteItem = {
  id: string;
  label: string;
  command: string;
};

function searchNeedle(input: string): string {
  const parsed = parseCommand(input);
  if (parsed.ok && parsed.type === "function") {
    const fn = getFunction(parsed.code);
    if (fn?.arg === "symbol") {
      return parsed.arg ?? "";
    }
    return "";
  }
  if (parsed.ok && parsed.type === "symbol") {
    return parsed.query;
  }
  return input.trim();
}

export function CommandPalette({
  open,
  onClose,
  onRouted,
}: CommandPaletteProps): React.JSX.Element | null {
  const [value, setValue] = useState("");
  const [hint, setHint] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const { dockApi } = useWorkspaceRuntime();
  const setActiveSymbol = useSymbolContext((s) => s.setActiveSymbol);
  const setCopilotQuery = useCopilotDraft((s) => s.setQuery);

  const parsed = useMemo(() => parseCommand(value), [value]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setValue("");
    setHint("");
    setRecents(loadCommandRecents(window.localStorage));
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const needle = searchNeedle(value);
    if (needle.length === 0) {
      setInstruments([]);
      return;
    }
    let cancelled = false;
    void searchInstrumentsAction(needle).then((result) => {
      if (cancelled || !result.ok) {
        return;
      }
      setInstruments(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, value]);

  const run = useCallback(
    async (command: string) => {
      const needle = searchNeedle(command);
      let universe = instruments;
      if (needle.length > 0) {
        const fetched = await searchInstrumentsAction(needle);
        if (fetched.ok) {
          universe = fetched.data;
        }
      }
      const result = resolveCommand(command, universe);
      if (!result.ok) {
        setHint(result.hint);
        return;
      }
      if (dockApi) {
        focusPanel(dockApi, result.panelId);
      }
      if (result.symbol) {
        setActiveSymbol(result.symbol);
      }
      if (result.copilotQuery) {
        setCopilotQuery(result.copilotQuery);
      }
      pushCommandRecent(window.localStorage, result.recent);
      onRouted?.(result.panelId);
      onClose();
    },
    [dockApi, instruments, onClose, onRouted, setActiveSymbol, setCopilotQuery],
  );

  const items = useMemo((): PaletteItem[] => {
    if (value.trim().length === 0) {
      return recents.map((command) => ({
        id: `recent-${command}`,
        label: command,
        command,
      }));
    }
    if (parsed.ok && parsed.type === "function") {
      const fn = getFunction(parsed.code);
      return [
        {
          id: `fn-${parsed.code}-${parsed.arg ?? ""}`,
          label: fn
            ? `${parsed.code}${parsed.arg ? ` ${parsed.arg}` : ""} — ${fn.title}`
            : parsed.code,
          command: value,
        },
      ];
    }
    if (parsed.ok && parsed.type === "symbol") {
      return fuzzyMatchInstruments(parsed.query, instruments).map((row) => ({
        id: `sym-${row.symbol}`,
        label: `${row.symbol}  ${row.name}`,
        command: row.symbol,
      }));
    }
    return [];
  }, [instruments, parsed, recents, value]);

  if (!open) {
    return null;
  }

  const showHint = !parsed.ok ? parsed.hint : hint;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 pt-24"
      data-testid="command-palette"
      role="dialog"
      aria-modal="true"
      aria-labelledby="palette-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg border border-border bg-card shadow-lg"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <p
          id="palette-title"
          className="px-3 pt-3 font-mono text-xs tracking-wide text-primary uppercase"
        >
          Command palette
        </p>
        <Command
          shouldFilter={false}
          label="Command palette"
          className="bg-card text-foreground"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
        >
          <Command.Input
            autoFocus
            value={value}
            onValueChange={(next) => {
              setHint("");
              setValue(next);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void run(value);
              }
            }}
            placeholder="GIP MSFT · DES NVDA · AI hello"
            data-testid="palette-input"
            className="mt-2 w-full border-0 border-b border-input bg-background px-3 py-2 font-mono text-sm text-foreground outline-none"
          />
          {showHint ? (
            <p className="px-3 py-1 text-xs text-muted-foreground" data-testid="palette-hint">
              {showHint}
            </p>
          ) : null}
          <Command.List className="max-h-64 overflow-auto py-1" data-testid="palette-list">
            {value.trim().length === 0 && items.length > 0 ? (
              <Command.Group heading="Recents" data-testid="palette-recents">
                {items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.id}
                    onSelect={() => {
                      void run(item.command);
                    }}
                    className="cursor-pointer px-3 py-1 font-mono text-sm data-[selected=true]:bg-secondary data-[selected=true]:text-primary"
                  >
                    {item.label}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : (
              items.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.id}
                  onSelect={() => {
                    void run(item.command);
                  }}
                  className="cursor-pointer px-3 py-1 font-mono text-sm data-[selected=true]:bg-secondary data-[selected=true]:text-primary"
                >
                  {item.label}
                </Command.Item>
              ))
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
