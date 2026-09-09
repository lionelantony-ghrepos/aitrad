"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  SCREENER_FIELD_REGISTRY,
  screenerCsvRows,
  screenerFieldIdSchema,
  screenerSortColumnSchema,
  type ScreenRecord,
  type ScreenerFieldId,
  type ScreenerRow,
  type ScreenerSort,
  type ScreenerSortColumn,
  type Watchlist,
} from "@meridian/schemas";
import {
  addScreenerResultsToWatchlistAction,
  deleteScreenAction,
  listScreensAction,
  listScreenerWatchlistsAction,
  runScreenerAction,
  saveScreenAction,
} from "@/app/actions/screener";
import { toCsv } from "@/lib/blotter/view";
import { notifyWatchlistChanged } from "@/lib/watchlist/changed";
import {
  criteriaToDraft,
  draftToCriteria,
  emptyDraftCondition,
  emptyDraftCriteria,
  emptyDraftGroup,
  type DraftCondition,
  type DraftCriteria,
} from "@/lib/screener/draft";
import { useSymbolContext } from "@/lib/symbol-context";

function formatNum(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function chgClass(value: number | null): string {
  if (value == null) {
    return "text-muted-foreground";
  }
  if (value > 0) {
    return "text-up";
  }
  if (value < 0) {
    return "text-down";
  }
  return "text-muted-foreground";
}

const FIELD_IDS = screenerFieldIdSchema.options;

export function ScreenerPanel(props: IDockviewPanelProps): React.JSX.Element {
  void props;
  const setActiveSymbol = useSymbolContext((s) => s.setActiveSymbol);
  const [draft, setDraft] = useState<DraftCriteria>(() => emptyDraftCriteria());
  const [sort, setSort] = useState<ScreenerSort>({ column: "symbol", dir: "asc" });
  const [rows, setRows] = useState<ScreenerRow[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [screens, setScreens] = useState<ScreenRecord[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState<string>("");
  const [screenName, setScreenName] = useState("");
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [watchlistId, setWatchlistId] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const loadMeta = useCallback(async () => {
    const [saved, lists] = await Promise.all([listScreensAction(), listScreenerWatchlistsAction()]);
    if (saved.ok) {
      setScreens(saved.data);
    }
    if (lists.ok) {
      setWatchlists(lists.data);
      setWatchlistId((prev) => prev || lists.data[0]?.id || "");
    }
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    const criteria = draftToCriteria(draft);
    if (!criteria) {
      setLiveCount(null);
      return;
    }
    const handle = window.setTimeout(() => {
      void runScreenerAction({ op: "count", criteria, sort }).then((result) => {
        if (result.ok && "count" in result.data) {
          setLiveCount(result.data.count);
        }
      });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [draft, sort]);

  const run = useCallback(async () => {
    const criteria = draftToCriteria(draft);
    if (!criteria) {
      setStatus("error");
      setError("Complete at least one valid condition.");
      return;
    }
    setStatus("loading");
    setError(null);
    const result = await runScreenerAction({ op: "run", criteria, sort });
    if (!result.ok || !("rows" in result.data)) {
      setStatus("error");
      setError(result.ok ? "Screener run failed." : result.message);
      setRows([]);
      return;
    }
    setRows(result.data.rows);
    setCount(result.data.count);
    setTruncated(result.data.truncated);
    setStatus(result.data.rows.length === 0 ? "empty" : "ready");
  }, [draft, sort]);

  const save = useCallback(async () => {
    const criteria = draftToCriteria(draft);
    if (!criteria) {
      setBanner("Complete criteria before saving.");
      return;
    }
    const result = await saveScreenAction({
      id: selectedScreenId || undefined,
      name: screenName,
      criteria,
    });
    if (!result.ok) {
      setBanner(result.message);
      return;
    }
    setSelectedScreenId(result.data.id);
    setBanner("Screen saved.");
    await loadMeta();
  }, [draft, loadMeta, screenName, selectedScreenId]);

  const loadScreen = useCallback(
    (id: string) => {
      setSelectedScreenId(id);
      const found = screens.find((row) => row.id === id);
      if (!found) {
        return;
      }
      setDraft(criteriaToDraft(found.criteria));
      setScreenName(found.name);
      setBanner(null);
    },
    [screens],
  );

  const removeScreen = useCallback(async () => {
    if (!selectedScreenId) {
      return;
    }
    const result = await deleteScreenAction(selectedScreenId);
    if (!result.ok) {
      setBanner(result.message);
      return;
    }
    setSelectedScreenId("");
    setScreenName("");
    setBanner("Screen deleted.");
    await loadMeta();
  }, [loadMeta, selectedScreenId]);

  const addToWatchlist = useCallback(async () => {
    const lists = await listScreenerWatchlistsAction();
    if (lists.ok) {
      setWatchlists(lists.data);
    }
    const targetId = watchlistId || (lists.ok ? lists.data[0]?.id : "") || "";
    if (lists.ok && !watchlistId && lists.data[0]) {
      setWatchlistId(lists.data[0].id);
    }
    if (!targetId || rows.length === 0) {
      setBanner("Run the screener and pick a watchlist.");
      return;
    }
    const result = await addScreenerResultsToWatchlistAction({
      watchlistId: targetId,
      instruments: rows.map((row) => ({ instrument_id: row.instrument_id, symbol: row.symbol })),
    });
    if (!result.ok) {
      setBanner(result.message);
      return;
    }
    setBanner(`Added ${result.data.added} symbols (${result.data.skipped} skipped).`);
    notifyWatchlistChanged();
  }, [rows, watchlistId]);

  const exportCsv = useCallback(() => {
    const csv = toCsv(screenerCsvRows(rows));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "screener.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, [rows]);

  const toggleSort = useCallback((column: ScreenerSortColumn) => {
    setSort((prev) =>
      prev.column === column
        ? { column, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { column, dir: "asc" },
    );
  }, []);

  const columns = useMemo<ColumnDef<ScreenerRow>[]>(
    () => [
      { accessorKey: "symbol", header: "Sym", cell: (ctx) => ctx.row.original.symbol },
      { accessorKey: "name", header: "Name", cell: (ctx) => ctx.row.original.name },
      { accessorKey: "sector", header: "Sector", cell: (ctx) => ctx.row.original.sector ?? "—" },
      {
        accessorKey: "pe",
        header: "P/E",
        cell: (ctx) => <span className="tabular-nums">{formatNum(ctx.row.original.pe, 1)}</span>,
      },
      {
        accessorKey: "dividend_yield",
        header: "Yield",
        cell: (ctx) => (
          <span className="tabular-nums">{formatNum(ctx.row.original.dividend_yield, 2)}</span>
        ),
      },
      {
        accessorKey: "pct_chg",
        header: "%",
        cell: (ctx) => (
          <span className={`tabular-nums ${chgClass(ctx.row.original.pct_chg)}`}>
            {formatNum(ctx.row.original.pct_chg, 2)}
          </span>
        ),
      },
      {
        accessorKey: "volume",
        header: "Vol",
        cell: (ctx) => (
          <span className="tabular-nums">{formatNum(ctx.row.original.volume, 0)}</span>
        ),
      },
      {
        accessorKey: "rsi_14",
        header: "RSI",
        cell: (ctx) => (
          <span className="tabular-nums">{formatNum(ctx.row.original.rsi_14, 1)}</span>
        ),
      },
      {
        accessorKey: "last",
        header: "Last",
        cell: (ctx) => <span className="tabular-nums">{formatNum(ctx.row.original.last, 2)}</span>,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const tableRows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 12,
  });

  const updateCondition = (
    groupIndex: number,
    conditionId: string,
    patch: Partial<DraftCondition>,
  ) => {
    setDraft((prev) => ({
      ...prev,
      groups: prev.groups.map((group, index) =>
        index !== groupIndex
          ? group
          : {
              ...group,
              conditions: group.conditions.map((condition) =>
                condition.id === conditionId ? { ...condition, ...patch } : condition,
              ),
            },
      ),
    }));
  };

  return (
    <div
      className="flex h-full flex-col gap-1 overflow-hidden bg-background p-1 text-xs"
      data-testid="panel-screener"
    >
      <div className="flex flex-wrap items-center gap-1 text-muted-foreground">
        <span>Match</span>
        <select
          className="border border-border bg-background px-1 py-0.5"
          data-testid="screener-root-combinator"
          value={draft.combinator}
          onChange={(event) =>
            setDraft((prev) => ({
              ...prev,
              combinator: event.target.value === "or" ? "or" : "and",
            }))
          }
        >
          <option value="and">AND</option>
          <option value="or">OR</option>
        </select>
        <span className="tabular-nums text-primary" data-testid="screener-live-count">
          {liveCount == null ? "—" : `${liveCount} matches`}
        </span>
        <button
          type="button"
          className="border border-primary px-2 py-0.5 text-primary"
          data-testid="screener-run"
          onClick={() => void run()}
        >
          Run
        </button>
        <button
          type="button"
          className="border border-border px-2 py-0.5"
          data-testid="screener-add-group"
          onClick={() =>
            setDraft((prev) => ({ ...prev, groups: [...prev.groups, emptyDraftGroup()] }))
          }
        >
          Add group
        </button>
      </div>

      <div className="max-h-36 space-y-1 overflow-auto border border-border p-1">
        {draft.groups.map((group, groupIndex) => (
          <div
            key={group.id}
            className="space-y-1 border border-border/60 p-1"
            data-testid={`screener-group-${groupIndex}`}
          >
            <div className="flex items-center gap-1">
              <select
                className="border border-border bg-background px-1 py-0.5"
                value={group.combinator}
                onChange={(event) => {
                  const combinator = event.target.value === "or" ? "or" : "and";
                  setDraft((prev) => ({
                    ...prev,
                    groups: prev.groups.map((item, index) =>
                      index === groupIndex ? { ...item, combinator } : item,
                    ),
                  }));
                }}
              >
                <option value="and">AND</option>
                <option value="or">OR</option>
              </select>
              <button
                type="button"
                className="border border-border px-1 py-0.5"
                data-testid="screener-add-condition"
                onClick={() => {
                  setDraft((prev) => ({
                    ...prev,
                    groups: prev.groups.map((item, index) =>
                      index === groupIndex
                        ? { ...item, conditions: [...item.conditions, emptyDraftCondition()] }
                        : item,
                    ),
                  }));
                }}
              >
                + condition
              </button>
            </div>
            {group.conditions.map((condition) => (
              <ConditionRow
                key={condition.id}
                condition={condition}
                onChange={(patch) => updateCondition(groupIndex, condition.id, patch)}
                onRemove={() => {
                  setDraft((prev) => ({
                    ...prev,
                    groups: prev.groups.map((item, index) =>
                      index === groupIndex
                        ? {
                            ...item,
                            conditions: item.conditions.filter((row) => row.id !== condition.id),
                          }
                        : item,
                    ),
                  }));
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <input
          className="w-36 border border-border bg-background px-1 py-0.5"
          data-testid="screener-name"
          placeholder="Screen name"
          value={screenName}
          onChange={(event) => setScreenName(event.target.value)}
        />
        <button
          type="button"
          className="border border-border px-2 py-0.5"
          data-testid="screener-save"
          onClick={() => void save()}
        >
          Save
        </button>
        <select
          className="border border-border bg-background px-1 py-0.5"
          data-testid="screener-load"
          value={selectedScreenId}
          onChange={(event) => loadScreen(event.target.value)}
        >
          <option value="">Load screen…</option>
          {screens.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="border border-border px-2 py-0.5"
          data-testid="screener-delete"
          onClick={() => void removeScreen()}
        >
          Delete
        </button>
        <select
          className="border border-border bg-background px-1 py-0.5"
          data-testid="screener-watchlist"
          value={watchlistId}
          onFocus={() => {
            void loadMeta();
          }}
          onChange={(event) => setWatchlistId(event.target.value)}
        >
          <option value="">Watchlist…</option>
          {watchlists.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="border border-border px-2 py-0.5"
          data-testid="screener-add-watchlist"
          onClick={() => void addToWatchlist()}
        >
          Add results to watchlist
        </button>
        <button
          type="button"
          className="border border-border px-2 py-0.5"
          data-testid="screener-export"
          onClick={exportCsv}
        >
          Export CSV
        </button>
      </div>

      {banner ? <p className="text-primary">{banner}</p> : null}
      {status === "loading" ? <p className="text-muted-foreground">Running…</p> : null}
      {status === "error" ? (
        <p className="text-down" data-testid="screener-error">
          {error}
        </p>
      ) : null}
      {status === "empty" ? (
        <p className="text-muted-foreground" data-testid="screener-empty">
          No matches.
        </p>
      ) : null}
      {status === "ready" ? (
        <p className="text-muted-foreground tabular-nums" data-testid="screener-result-count">
          {count} results{truncated ? " (truncated)" : ""}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto" ref={parentRef} data-testid="screener-grid">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const key = header.column.id;
                  const sortable = screenerSortColumnSchema.safeParse(key).success;
                  return (
                    <th key={header.id} className="border-b border-border px-1 py-0.5 font-medium">
                      {sortable ? (
                        <button
                          type="button"
                          className="text-left"
                          data-testid={`screener-sort-${key}`}
                          onClick={() => toggleSort(key as ScreenerSortColumn)}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sort.column === key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody style={{ height: `${virtualizer.getTotalSize()}px` }} className="relative">
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = tableRows[virtualRow.index];
              if (!row) {
                return null;
              }
              return (
                <tr
                  key={row.id}
                  className="absolute left-0 w-full cursor-pointer hover:bg-muted/40"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                  data-testid={`screener-row-${row.original.symbol}`}
                  onClick={() => setActiveSymbol(row.original.symbol)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-1 py-0.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConditionRow(props: {
  condition: DraftCondition;
  onChange: (patch: Partial<DraftCondition>) => void;
  onRemove: () => void;
}): React.JSX.Element {
  const def = SCREENER_FIELD_REGISTRY[props.condition.field];
  return (
    <div className="flex flex-wrap items-center gap-1" data-testid="screener-condition">
      <select
        className="border border-border bg-background px-1 py-0.5"
        data-testid="screener-field"
        value={props.condition.field}
        onChange={(event) => {
          const field = event.target.value as ScreenerFieldId;
          const next = SCREENER_FIELD_REGISTRY[field];
          const op = next.operators.includes(props.condition.op)
            ? props.condition.op
            : next.operators[0];
          props.onChange({ field, op });
        }}
      >
        {FIELD_IDS.map((id) => (
          <option key={id} value={id}>
            {SCREENER_FIELD_REGISTRY[id].label}
          </option>
        ))}
      </select>
      <select
        className="border border-border bg-background px-1 py-0.5"
        data-testid="screener-op"
        value={props.condition.op}
        onChange={(event) => props.onChange({ op: event.target.value as DraftCondition["op"] })}
      >
        {def.operators.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>
      {props.condition.op !== "is_null" && props.condition.op !== "any" ? (
        <input
          className="w-28 border border-border bg-background px-1 py-0.5"
          data-testid="screener-value"
          value={props.condition.value}
          onChange={(event) => props.onChange({ value: event.target.value })}
        />
      ) : null}
      <button type="button" className="border border-border px-1 py-0.5" onClick={props.onRemove}>
        ×
      </button>
    </div>
  );
}
