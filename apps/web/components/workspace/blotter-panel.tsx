"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  orderDraftSchema,
  type BlotterFilters,
  type BlotterTab,
  type ExecutionRecord,
  type OrderRecord,
  type OrderStatus,
  type RuleAuditView,
} from "@meridian/schemas";
import {
  applyPaperTicksAction,
  cancelOrderAction,
  getRuleAuditAction,
  listExecutionsAction,
  listOrdersAction,
} from "@/app/actions/orders";
import { explainRowsFromAudit } from "@/lib/blotter/explain";
import {
  avgFillPx,
  blotterCsvRows,
  canModifyOrder,
  emptyBlotterFilters,
  filterBlotterRows,
  toCsv,
  type BlotterRow,
} from "@/lib/blotter/view";
import { focusPanel } from "@/lib/command-palette/focus-panel";
import { useOrderTicketIntent } from "@/lib/order-ticket/intent";
import {
  createInsforgeOrdersTransport,
  createWindowOrdersTransport,
  notifyOrdersChanged,
} from "@/lib/orders/orders-live";
import { useQuotes } from "@/lib/quotes/use-quotes";
import {
  createInsforgeQuotesTransport,
  createWindowQuotesTransport,
  parseTickBatchPayload,
  TEST_TICK_BATCH_EVENT,
} from "@/lib/quotes/transport";
import { useSymbolContext } from "@/lib/symbol-context";
import { useWorkspaceRuntime } from "@/lib/workspace-runtime";

const TABS: { id: BlotterTab; label: string }[] = [
  { id: "working", label: "Working" },
  { id: "filled", label: "Filled" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

function formatPx(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return value.toFixed(2);
}

function statusTone(status: OrderStatus): string {
  if (status === "filled" || status === "partially_filled") {
    return "text-up";
  }
  if (status === "rejected") {
    return "text-down";
  }
  if (status === "working" || status === "accepted") {
    return "text-primary";
  }
  return "text-muted-foreground";
}

function draftFromOrder(order: OrderRecord) {
  return orderDraftSchema.parse({
    symbol: order.symbol,
    side: order.side,
    qty: order.qty,
    order_type: order.order_type,
    limit_price: order.limit_price,
    stop_price: order.stop_price,
    tif: order.tif,
    group_type: order.group_type ?? null,
    trail_type: order.trail_type ?? null,
    trail_value: order.trail_value ?? null,
  });
}

export function BlotterPanel(props: IDockviewPanelProps): React.JSX.Element {
  void props;
  const { e2eFeed, userId, dockApi } = useWorkspaceRuntime();
  const quotesTransport = useMemo(
    () => (e2eFeed ? createWindowQuotesTransport() : createInsforgeQuotesTransport()),
    [e2eFeed],
  );
  const ordersTransport = useMemo(
    () =>
      e2eFeed || !userId ? createWindowOrdersTransport() : createInsforgeOrdersTransport(userId),
    [e2eFeed, userId],
  );
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<BlotterTab>("all");
  const [filters, setFilters] = useState<BlotterFilters>(emptyBlotterFilters);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [explainFor, setExplainFor] = useState<string | null>(null);
  const [audit, setAudit] = useState<RuleAuditView | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [fillsFor, setFillsFor] = useState<string | null>(null);
  const setActiveSymbol = useSymbolContext((s) => s.setActiveSymbol);
  const applyPrefill = useOrderTicketIntent((s) => s.applyPrefill);

  const symbols = useMemo(() => [...new Set(orders.map((row) => row.symbol))], [orders]);
  const ids = useMemo(() => [...new Set(orders.map((row) => row.instrument_id))], [orders]);
  const { quotes } = useQuotes(e2eFeed ? symbols : [], {
    transport: quotesTransport,
    instrumentIds: e2eFeed ? ids : [],
  });

  const load = useCallback(async () => {
    const [orderResult, execResult] = await Promise.all([
      listOrdersAction(),
      listExecutionsAction(),
    ]);
    if (!orderResult.ok) {
      setStatus("error");
      setError(orderResult.message);
      return;
    }
    setOrders(orderResult.data);
    setExecutions(execResult.ok ? execResult.data : []);
    setStatus(orderResult.data.length === 0 ? "empty" : "ready");
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return ordersTransport.subscribe(() => {
      void load();
    });
  }, [ordersTransport, load]);

  useEffect(() => {
    if (!e2eFeed) {
      return;
    }
    const handler = (event: Event): void => {
      const batch = parseTickBatchPayload((event as CustomEvent<unknown>).detail);
      if (!batch || batch.ticks.length === 0) {
        return;
      }
      void applyPaperTicksAction(
        batch.ticks.map((tick) => ({
          instrument_id: tick.instrument_id,
          symbol: tick.symbol,
          last: tick.last,
          bid: tick.bid,
          ask: tick.ask,
          ts: tick.ts,
        })),
      ).then((result) => {
        if (!result.ok) {
          return;
        }
        setOrders(result.data);
        setStatus(result.data.length === 0 ? "empty" : "ready");
        void listExecutionsAction().then((execResult) => {
          if (execResult.ok) {
            setExecutions(execResult.data);
          }
        });
      });
    };
    window.addEventListener(TEST_TICK_BATCH_EVENT, handler);
    return () => {
      window.removeEventListener(TEST_TICK_BATCH_EVENT, handler);
    };
  }, [e2eFeed]);

  useEffect(() => {
    if (!e2eFeed) {
      return;
    }
    const ticks = Object.values(quotes).map((row) => ({
      instrument_id: row.instrument_id,
      symbol: row.symbol,
      last: row.last,
      bid: row.bid,
      ask: row.ask,
      ts: row.ts,
    }));
    if (ticks.length === 0) {
      return;
    }
    void applyPaperTicksAction(ticks).then((result) => {
      if (!result.ok) {
        return;
      }
      setOrders(result.data);
      setStatus(result.data.length === 0 ? "empty" : "ready");
    });
  }, [quotes, e2eFeed]);

  const filtered = useMemo(() => filterBlotterRows(orders, tab, filters), [orders, tab, filters]);
  const visible = useMemo(
    () =>
      filtered.filter((row) => {
        if (row.parentId && collapsed.has(row.parentId)) {
          return false;
        }
        return true;
      }),
    [filtered, collapsed],
  );

  const onCancel = useCallback(async (order: OrderRecord) => {
    setActionError(null);
    const result = await cancelOrderAction(order.id);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    setOrders((current) =>
      current.map((row) => (row.id === result.data.order.id ? result.data.order : row)),
    );
    notifyOrdersChanged();
  }, []);

  const onModify = useCallback(
    async (order: OrderRecord) => {
      setActionError(null);
      const result = await cancelOrderAction(order.id);
      if (!result.ok) {
        setActionError(result.message);
        return;
      }
      setOrders((current) =>
        current.map((row) => (row.id === result.data.order.id ? result.data.order : row)),
      );
      setActiveSymbol(order.symbol);
      applyPrefill(draftFromOrder(order));
      if (dockApi) {
        focusPanel(dockApi, "orderTicket");
      }
      notifyOrdersChanged();
    },
    [applyPrefill, dockApi, setActiveSymbol],
  );

  const onExplain = useCallback(async (order: OrderRecord) => {
    setExplainFor(order.id);
    setAudit(null);
    setAuditError(null);
    if (!order.rule_audit_id) {
      setAuditError("No rule audit id.");
      return;
    }
    const result = await getRuleAuditAction(order.rule_audit_id);
    if (!result.ok) {
      setAuditError(result.message);
      return;
    }
    setAudit(result.data);
  }, []);

  const onExport = useCallback(() => {
    const csv = toCsv(blotterCsvRows(visible, executions));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "blotter.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [visible, executions]);

  const fills = fillsFor ? executions.filter((row) => row.order_id === fillsFor) : [];
  const explainOrder = orders.find((row) => row.id === explainFor) ?? null;
  const explainRows = audit ? explainRowsFromAudit(audit) : [];

  const columns = useMemo<ColumnDef<BlotterRow>[]>(
    () => [
      {
        id: "time",
        header: "Time",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.order.created_at.slice(11, 19)}</span>
        ),
      },
      {
        id: "symbol",
        header: "Symbol",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <span className="flex items-center gap-1" style={{ paddingLeft: item.depth * 12 }}>
              {item.hasChildren ? (
                <button
                  type="button"
                  className="text-primary"
                  data-testid={`blotter-expand-${item.order.id}`}
                  onClick={() => {
                    setCollapsed((current) => {
                      const next = new Set(current);
                      if (next.has(item.order.id)) {
                        next.delete(item.order.id);
                      } else {
                        next.add(item.order.id);
                      }
                      return next;
                    });
                  }}
                >
                  {collapsed.has(item.order.id) ? "+" : "−"}
                </button>
              ) : null}
              {item.order.symbol}
              {item.order.leg_role ? ` ${item.order.leg_role}` : ""}
            </span>
          );
        },
      },
      {
        id: "side",
        header: "Side",
        cell: ({ row }) => (
          <span className={row.original.order.side === "buy" ? "text-up" : "text-down"}>
            {row.original.order.side}
          </span>
        ),
      },
      { id: "type", header: "Type", cell: ({ row }) => row.original.order.order_type },
      {
        id: "qty",
        header: "Qty",
        cell: ({ row }) => <span className="tabular-nums">{row.original.order.qty}</span>,
      },
      {
        id: "filled",
        header: "Filled",
        cell: ({ row }) => <span className="tabular-nums">{row.original.order.filled_qty}</span>,
      },
      {
        id: "avg",
        header: "Avg px",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatPx(avgFillPx(row.original.order.id, executions))}
          </span>
        ),
      },
      {
        id: "limitStop",
        header: "Lmt/Stp",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatPx(row.original.order.limit_price)}/{formatPx(row.original.order.stop_price)}
          </span>
        ),
      },
      { id: "tif", header: "TIF", cell: ({ row }) => row.original.order.tif },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={statusTone(row.original.order.status)}
            data-testid={
              row.original.order.leg_role
                ? `blotter-status-${row.original.order.leg_role}`
                : "blotter-status-chip"
            }
          >
            {row.original.order.status}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const order = row.original.order;
          const working = canModifyOrder(order.status);
          return (
            <span className="flex flex-wrap gap-1">
              {working ? (
                <>
                  <button
                    type="button"
                    className="border border-border px-1 text-primary"
                    data-testid="blotter-cancel"
                    onClick={() => {
                      void onCancel(order);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="border border-border px-1 text-primary"
                    data-testid="blotter-modify"
                    onClick={() => {
                      void onModify(order);
                    }}
                  >
                    Modify
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="border border-border px-1 text-primary"
                data-testid="blotter-executions"
                onClick={() => {
                  setFillsFor(order.id);
                }}
              >
                Fills
              </button>
              {order.status === "rejected" ? (
                <button
                  type="button"
                  className="border border-border px-1 text-primary"
                  data-testid="blotter-explain"
                  onClick={() => {
                    void onExplain(order);
                  }}
                >
                  Explain
                </button>
              ) : null}
            </span>
          );
        },
      },
    ],
    [collapsed, executions, onCancel, onExplain, onModify],
  );

  const table = useReactTable({
    data: visible,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.order.id,
  });
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 16,
  });

  return (
    <div
      className="flex h-full flex-col gap-1 bg-background p-2 text-xs text-foreground"
      data-testid="panel-blotter"
    >
      <div className="flex items-center justify-between">
        <p className="font-medium text-primary">Blotter</p>
        <button
          type="button"
          className="border border-border px-2 text-primary"
          data-testid="blotter-export"
          onClick={onExport}
        >
          Export CSV
        </button>
      </div>
      <div className="flex gap-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`h-6 border px-2 ${tab === item.id ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            data-testid={`blotter-tab-${item.id}`}
            onClick={() => {
              setTab(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1">
        <input
          className="h-6 border border-input bg-background px-1"
          data-testid="blotter-filter-symbol"
          placeholder="Symbol"
          value={filters.symbol}
          onChange={(event) => {
            setFilters((current) => ({ ...current, symbol: event.target.value }));
          }}
        />
        <select
          className="h-6 border border-input bg-background"
          data-testid="blotter-filter-side"
          value={filters.side}
          onChange={(event) => {
            setFilters((current) => ({
              ...current,
              side: event.target.value as BlotterFilters["side"],
            }));
          }}
        >
          <option value="all">All sides</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <select
          className="h-6 border border-input bg-background"
          data-testid="blotter-filter-status"
          value={filters.status}
          onChange={(event) => {
            setFilters((current) => ({
              ...current,
              status: event.target.value as BlotterFilters["status"],
            }));
          }}
        >
          <option value="all">All status</option>
          {(
            [
              "accepted",
              "working",
              "partially_filled",
              "filled",
              "cancelled",
              "rejected",
              "expired",
            ] as const
          ).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <input
          className="h-6 border border-input bg-background px-1"
          data-testid="blotter-filter-from"
          type="date"
          value={filters.dateFrom}
          onChange={(event) => {
            setFilters((current) => ({ ...current, dateFrom: event.target.value }));
          }}
        />
        <input
          className="h-6 border border-input bg-background px-1"
          data-testid="blotter-filter-to"
          type="date"
          value={filters.dateTo}
          onChange={(event) => {
            setFilters((current) => ({ ...current, dateTo: event.target.value }));
          }}
        />
      </div>
      {status === "loading" ? (
        <p className="text-muted-foreground" data-testid="blotter-loading">
          Loading orders…
        </p>
      ) : null}
      {status === "empty" ? (
        <p className="text-muted-foreground" data-testid="blotter-empty">
          No orders yet.
        </p>
      ) : null}
      {status === "error" ? (
        <p className="text-down" data-testid="blotter-error">
          {error}
        </p>
      ) : null}
      {actionError ? (
        <p className="text-down" data-testid="blotter-action-error">
          {actionError}
        </p>
      ) : null}
      <div
        className="min-h-[140px] flex-1 overflow-auto"
        ref={parentRef}
        data-testid="blotter-grid"
      >
        <div className="grid grid-cols-[72px_1fr_48px_72px_40px_40px_56px_88px_36px_110px_1fr] gap-1 border-b border-border pb-1 text-muted-foreground">
          {table
            .getHeaderGroups()
            .map((group) =>
              group.headers.map((header) => (
                <div key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              )),
            )}
        </div>
        {(() => {
          const tableRows = table.getRowModel().rows;
          const virtualRows = virtualizer.getVirtualItems();
          const windowed =
            tableRows.length > 80 && virtualRows.length > 0
              ? virtualRows
                  .map((item) => tableRows[item.index])
                  .filter((row): row is (typeof tableRows)[number] => row !== undefined)
              : tableRows;
          return windowed.map((row) => {
            const order = row.original.order;
            return (
              <div
                key={row.id}
                className="grid grid-cols-[72px_1fr_48px_72px_40px_40px_56px_88px_36px_110px_1fr] gap-1 border-b border-border py-0.5 font-mono"
                data-testid={
                  order.leg_role ? `blotter-leg-${order.leg_role}` : `blotter-row-${order.id}`
                }
                data-status={order.status}
                data-symbol={order.symbol}
              >
                {row.getVisibleCells().map((cell) => (
                  <div key={cell.id} className="relative z-10 min-w-0">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          });
        })()}
      </div>
      {explainOrder ? (
        <div className="border border-border bg-card p-2" data-testid="blotter-explain-popover">
          <p className="text-primary">Explain {explainOrder.symbol}</p>
          <p className="text-down" data-testid="blotter-reject-reason">
            {explainOrder.reject_reason ?? ""}
          </p>
          {auditError ? <p className="text-down">{auditError}</p> : null}
          {explainRows.map((row) => (
            <p
              key={`${row.rowId}-${row.reason}`}
              className="font-mono"
              data-testid="blotter-audit-row"
            >
              {row.tableKey ? `${row.tableKey} ` : ""}
              {row.reason}
            </p>
          ))}
          <button
            type="button"
            className="mt-1 border border-border px-2"
            onClick={() => {
              setExplainFor(null);
            }}
          >
            Close
          </button>
        </div>
      ) : null}
      {fillsFor ? (
        <div className="border border-border bg-card p-2" data-testid="blotter-exec-drawer">
          <p className="text-primary">Executions</p>
          {fills.length === 0 ? (
            <p className="text-muted-foreground">No fills.</p>
          ) : (
            fills.map((fill) => (
              <p key={fill.id} className="font-mono tabular-nums" data-testid="blotter-fill-row">
                {fill.qty} @ {fill.price.toFixed(2)}
              </p>
            ))
          )}
          <button
            type="button"
            className="mt-1 border border-border px-2"
            onClick={() => {
              setFillsFor(null);
            }}
          >
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}
