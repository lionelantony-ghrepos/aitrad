"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import type { Instrument, QuotesLatest, Watchlist, WatchlistItem } from "@meridian/schemas";
import {
  addWatchlistItemAction,
  createWatchlistAction,
  deleteWatchlistAction,
  listQuotesAction,
  listWatchlistItemsAction,
  listWatchlistsAction,
  removeWatchlistItemAction,
  resolveInstrumentsAction,
  searchInstrumentsAction,
} from "@/app/actions/watchlists";
import { loadStoredLayout, persistSelectedWatchlistId } from "@/lib/layout-storage";
import { useQuotes } from "@/lib/quotes/use-quotes";
import { createInsforgeQuotesTransport, createWindowQuotesTransport } from "@/lib/quotes/transport";
import { useSymbolContext } from "@/lib/symbol-context";
import { useWorkspaceRuntime } from "@/lib/workspace-runtime";
import { netChange, pctChange } from "@/lib/watchlist/quote-change";
import { compareWatchlistRows, type WatchlistSortKey } from "@/lib/watchlist/sort";
import { WatchlistSparkline } from "./watchlist-sparkline";

function formatPx(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return value.toFixed(2);
}

function formatPct(value: number | null): string {
  if (value === null) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

type MenuState = { x: number; y: number; itemId: string; symbol: string } | null;

export function WatchlistPanel(props: IDockviewPanelProps): React.JSX.Element {
  const { e2eFeed } = useWorkspaceRuntime();
  const transport = useMemo(
    () => (e2eFeed ? createWindowQuotesTransport() : createInsforgeQuotesTransport()),
    [e2eFeed],
  );

  const setActiveSymbol = useSymbolContext((s) => s.setActiveSymbol);
  const [lists, setLists] = useState<Watchlist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [instruments, setInstruments] = useState<Record<string, Instrument>>({});
  const [seedQuotes, setSeedQuotes] = useState<QuotesLatest[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("Watchlist");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Instrument[]>([]);
  const [sortKey, setSortKey] = useState<WatchlistSortKey>("symbol");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [menu, setMenu] = useState<MenuState>(null);

  const loadLists = useCallback(async () => {
    const result = await listWatchlistsAction();
    if (!result.ok) {
      setStatus("error");
      setError(result.message);
      return;
    }
    setLists(result.data);
    const stored =
      typeof window === "undefined"
        ? null
        : loadStoredLayout(window.localStorage)?.selectedWatchlistId;
    const nextId =
      (stored && result.data.some((row) => row.id === stored) ? stored : null) ??
      result.data[0]?.id ??
      null;
    setSelectedId(nextId);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (!selectedId) {
      setItems([]);
      return;
    }
    if (typeof window !== "undefined") {
      persistSelectedWatchlistId(window.localStorage, selectedId);
    }
    void (async () => {
      const result = await listWatchlistItemsAction(selectedId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setItems(result.data);
      const ids = result.data.map((row) => row.instrument_id);
      const [inst, quotes] = await Promise.all([
        resolveInstrumentsAction(ids),
        listQuotesAction(ids),
      ]);
      if (inst.ok) {
        const map: Record<string, Instrument> = {};
        for (const row of inst.data) {
          map[row.id] = row;
        }
        setInstruments(map);
      }
      if (quotes.ok) {
        setSeedQuotes(quotes.data);
      }
    })();
  }, [selectedId]);

  const symbols = useMemo(() => {
    return items
      .map((row) => instruments[row.instrument_id]?.symbol)
      .filter((symbol): symbol is string => Boolean(symbol));
  }, [items, instruments]);

  const instrumentIds = useMemo(() => items.map((row) => row.instrument_id), [items]);

  const seedTicks = useMemo(
    () =>
      seedQuotes.map((row) => ({
        ...row,
        symbol: instruments[row.instrument_id]?.symbol,
      })),
    [seedQuotes, instruments],
  );

  const { quotes } = useQuotes(symbols, {
    transport,
    instrumentIds,
    seed: seedTicks,
  });

  useEffect(() => {
    const q = query.trim();
    if (q.length === 0) {
      setSuggestions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void searchInstrumentsAction(q).then((result) => {
        if (result.ok) {
          setSuggestions(result.data);
        }
      });
    }, 150);
    return () => {
      window.clearTimeout(handle);
    };
  }, [query]);

  function toggleSort(key: WatchlistSortKey): void {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "symbol" ? "asc" : "desc");
  }

  const rows = useMemo(() => {
    const mapped = items.map((item) => {
      const instrument = instruments[item.instrument_id];
      const quote = quotes[item.instrument_id];
      const last = quote?.last ?? null;
      const prev = quote?.prev_close ?? null;
      const net = last !== null && prev !== null ? netChange(last, prev) : null;
      const pct = last !== null && prev !== null ? pctChange(last, prev) : null;
      return {
        item,
        symbol: instrument?.symbol ?? "—",
        last,
        netChange: net,
        pctChange: pct,
        bid: quote?.bid ?? null,
        ask: quote?.ask ?? null,
        volume: quote?.volume ?? null,
        sparkline: quote?.sparkline ?? [],
        flash: quote?.flash ?? null,
      };
    });
    return mapped.sort((a, b) => compareWatchlistRows(a, b, sortKey, sortDir));
  }, [items, instruments, quotes, sortKey, sortDir]);

  async function onCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const result = await createWatchlistAction(newName);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setLists((prev) => [...prev, result.data]);
    setSelectedId(result.data.id);
  }

  async function onAdd(instrument: Instrument): Promise<void> {
    if (!selectedId) {
      setError("Create a list first.");
      return;
    }
    const result = await addWatchlistItemAction(selectedId, instrument.id, instrument.symbol);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setQuery("");
    setSuggestions([]);
    setItems((prev) => [...prev, result.data]);
    setInstruments((prev) => ({ ...prev, [instrument.id]: instrument }));
    const quoteResult = await listQuotesAction([instrument.id]);
    if (quoteResult.ok) {
      setSeedQuotes((prev) => [...prev, ...quoteResult.data]);
    }
  }

  async function onRemove(itemId: string): Promise<void> {
    const result = await removeWatchlistItemAction(itemId);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setItems((prev) => prev.filter((row) => row.id !== itemId));
    setMenu(null);
  }

  async function onDeleteList(): Promise<void> {
    if (!selectedId) {
      return;
    }
    const result = await deleteWatchlistAction(selectedId);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const remaining = lists.filter((row) => row.id !== selectedId);
    setLists(remaining);
    setSelectedId(remaining[0]?.id ?? null);
  }

  if (status === "loading") {
    return (
      <div
        className="h-full bg-background p-1 text-xs text-muted-foreground"
        data-testid="panel-watchlist"
        data-panel-id={props.api.id}
      >
        Loading watchlists…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="h-full bg-background p-1 text-xs text-down"
        data-testid="panel-watchlist"
        data-panel-id={props.api.id}
      >
        {error ?? "Unable to load watchlists."}
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col bg-background text-xs text-foreground"
      data-testid="panel-watchlist"
      data-panel-id={props.api.id}
      onClick={() => setMenu(null)}
    >
      <div className="flex flex-wrap gap-1 border-b border-border p-1">
        {lists.map((list) => (
          <button
            key={list.id}
            type="button"
            data-testid={`watchlist-tab-${list.name}`}
            className={`rounded-sm px-1 py-0.5 ${selectedId === list.id ? "bg-secondary text-primary" : "text-muted-foreground"}`}
            onClick={() => setSelectedId(list.id)}
          >
            {list.name}
          </button>
        ))}
        {lists.length > 0 ? (
          <button
            type="button"
            className="text-muted-foreground"
            onClick={() => void onDeleteList()}
          >
            Delete list
          </button>
        ) : null}
      </div>
      <form className="flex gap-1 border-b border-border p-1" onSubmit={(e) => void onCreate(e)}>
        <input
          className="min-w-0 flex-1 border border-input bg-card px-1 text-foreground"
          data-testid="watchlist-name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          aria-label="New list name"
        />
        <button
          type="submit"
          className="bg-primary px-1 text-primary-foreground"
          data-testid="watchlist-create"
        >
          Create
        </button>
      </form>
      <div className="relative border-b border-border p-1">
        <input
          className="w-full border border-input bg-card px-1 text-foreground"
          data-testid="watchlist-search"
          placeholder="Add symbol"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={!selectedId}
        />
        {suggestions.length > 0 ? (
          <ul className="absolute z-10 mt-0.5 w-full border border-border bg-card">
            {suggestions.map((instrument) => (
              <li key={instrument.id}>
                <button
                  type="button"
                  className="w-full px-1 py-0.5 text-left hover:bg-muted"
                  data-testid={`instrument-option-${instrument.symbol}`}
                  onClick={() => void onAdd(instrument)}
                >
                  <span className="font-mono text-primary">{instrument.symbol}</span>{" "}
                  {instrument.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {error ? (
        <p className="px-1 text-down" data-testid="watchlist-error">
          {error}
        </p>
      ) : null}
      {lists.length === 0 ? (
        <p className="p-1 text-muted-foreground">No lists yet. Create one to add symbols.</p>
      ) : rows.length === 0 ? (
        <p className="p-1 text-muted-foreground">Empty list. Search to add a symbol.</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse font-mono tabular-nums">
            <thead className="sticky top-0 bg-card text-muted-foreground">
              <tr>
                {(
                  [
                    ["symbol", "Sym"],
                    ["last", "Last"],
                    ["netChange", "Net"],
                    ["pctChange", "%"],
                    ["volume", "Vol"],
                  ] as const
                ).map(([key, label]) => (
                  <th key={key} className="cursor-pointer px-1 text-left font-sans font-medium">
                    <button type="button" onClick={() => toggleSort(key)}>
                      {label}
                    </button>
                  </th>
                ))}
                <th className="px-1 text-left font-sans font-medium">Bid/Ask</th>
                <th className="px-1 text-left font-sans font-medium">Trend</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const tone =
                  row.netChange === null ? "" : row.netChange >= 0 ? "text-up" : "text-down";
                const flashClass =
                  row.flash === "up" ? "flash-up" : row.flash === "down" ? "flash-down" : "";
                return (
                  <tr
                    key={row.item.id}
                    data-testid={`watchlist-row-${row.symbol}`}
                    data-instrument-id={row.item.instrument_id}
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => setActiveSymbol(row.symbol)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setMenu({
                        x: event.clientX,
                        y: event.clientY,
                        itemId: row.item.id,
                        symbol: row.symbol,
                      });
                    }}
                  >
                    <td className="px-1 text-primary">{row.symbol}</td>
                    <td
                      className={`px-1 ${tone} ${flashClass}`}
                      data-flash={row.flash ?? undefined}
                      data-testid={`watchlist-last-${row.symbol}`}
                    >
                      {formatPx(row.last)}
                    </td>
                    <td className={`px-1 ${tone}`}>{formatPx(row.netChange)}</td>
                    <td className={`px-1 ${tone}`}>{formatPct(row.pctChange)}</td>
                    <td className="px-1">
                      {row.volume === null ? "—" : Math.round(row.volume).toLocaleString()}
                    </td>
                    <td className="px-1">
                      {formatPx(row.bid)}/{formatPx(row.ask)}
                    </td>
                    <td className="px-1">
                      <WatchlistSparkline points={row.sparkline} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {menu ? (
        <button
          type="button"
          className="fixed z-50 border border-border bg-card px-2 py-1"
          style={{ left: menu.x, top: menu.y }}
          data-testid="watchlist-remove"
          onClick={() => void onRemove(menu.itemId)}
        >
          Remove {menu.symbol}
        </button>
      ) : null}
    </div>
  );
}
