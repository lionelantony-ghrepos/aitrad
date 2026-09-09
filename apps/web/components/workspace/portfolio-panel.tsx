"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  revaluePortfolio,
  type EquityCurveRange,
  type PortfolioPositionView,
  type PortfolioResponse,
} from "@meridian/schemas";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getPortfolioAction } from "@/app/actions/portfolio";
import { applyPaperTicksAction } from "@/app/actions/orders";
import { focusPanel } from "@/lib/command-palette/focus-panel";
import { useOrderTicketIntent } from "@/lib/order-ticket/intent";
import { closePositionDraft } from "@/lib/portfolio/close-draft";
import {
  createInsforgeOrdersTransport,
  createWindowOrdersTransport,
} from "@/lib/orders/orders-live";
import {
  createInsforgePositionsTransport,
  createWindowPositionsTransport,
} from "@/lib/portfolio/positions-live";
import { useQuotes } from "@/lib/quotes/use-quotes";
import {
  createInsforgeQuotesTransport,
  createWindowQuotesTransport,
  parseTickBatchPayload,
  TEST_TICK_BATCH_EVENT,
} from "@/lib/quotes/transport";
import { useSymbolContext } from "@/lib/symbol-context";
import { useWorkspaceRuntime } from "@/lib/workspace-runtime";

const RANGES: EquityCurveRange[] = ["1M", "3M", "1Y"];

const SLICE_COLORS = ["#ffb000", "#00d4ff", "#3dd68c", "#f44747", "#8b9bb4", "#e8edf2"];

function formatMoney(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function pnlClass(value: number): string {
  if (value > 0) {
    return "text-up";
  }
  if (value < 0) {
    return "text-down";
  }
  return "text-muted-foreground";
}

export function PortfolioPanel(props: IDockviewPanelProps): React.JSX.Element {
  void props;
  const { e2eFeed, userId, dockApi } = useWorkspaceRuntime();
  const quotesTransport = useMemo(
    () => (e2eFeed ? createWindowQuotesTransport() : createInsforgeQuotesTransport()),
    [e2eFeed],
  );
  const positionsTransport = useMemo(
    () =>
      e2eFeed || !userId
        ? createWindowPositionsTransport()
        : createInsforgePositionsTransport(userId),
    [e2eFeed, userId],
  );
  const ordersTransport = useMemo(
    () =>
      e2eFeed || !userId ? createWindowOrdersTransport() : createInsforgeOrdersTransport(userId),
    [e2eFeed, userId],
  );
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<EquityCurveRange>("1Y");
  const setActiveSymbol = useSymbolContext((s) => s.setActiveSymbol);
  const applyPrefill = useOrderTicketIntent((s) => s.applyPrefill);

  const symbols = useMemo(
    () => [...new Set((portfolio?.positions ?? []).map((row) => row.symbol))],
    [portfolio],
  );
  const ids = useMemo(
    () => [...new Set((portfolio?.positions ?? []).map((row) => row.instrument_id))],
    [portfolio],
  );
  const { quotes } = useQuotes(symbols, {
    transport: quotesTransport,
    instrumentIds: ids,
  });

  const load = useCallback(async () => {
    const result = await getPortfolioAction(range);
    if (!result.ok) {
      setStatus("error");
      setError(result.message);
      return;
    }
    setPortfolio(result.data);
    setStatus(result.data.positions.length === 0 ? "empty" : "ready");
    setError(null);
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const offPos = positionsTransport.subscribe(() => {
      void load();
    });
    const offOrd = ordersTransport.subscribe(() => {
      void load();
    });
    return () => {
      offPos();
      offOrd();
    };
  }, [positionsTransport, ordersTransport, load]);

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
      );
    };
    window.addEventListener(TEST_TICK_BATCH_EVENT, handler);
    return () => {
      window.removeEventListener(TEST_TICK_BATCH_EVENT, handler);
    };
  }, [e2eFeed]);

  const live = useMemo(() => {
    if (!portfolio) {
      return null;
    }
    const quoteMap: Record<string, { last: number; prev_close: number }> = {};
    for (const row of Object.values(quotes)) {
      quoteMap[row.instrument_id] = { last: row.last, prev_close: row.prev_close };
      if (row.symbol) {
        quoteMap[row.symbol] = { last: row.last, prev_close: row.prev_close };
      }
    }
    return revaluePortfolio(portfolio, quoteMap);
  }, [portfolio, quotes]);

  const rows = live?.positions ?? [];
  const parentRef = useRef<HTMLDivElement>(null);
  const table = useReactTable({
    data: rows,
    columns: useMemo<ColumnDef<PortfolioPositionView>[]>(
      () => [
        { id: "symbol", header: "Sym", cell: ({ row }) => row.original.symbol },
        {
          id: "qty",
          header: "Qty",
          cell: ({ row }) => <span className="tabular-nums">{row.original.qty}</span>,
        },
        {
          id: "avg",
          header: "Avg",
          cell: ({ row }) => (
            <span className="tabular-nums">{formatMoney(row.original.avg_cost)}</span>
          ),
        },
        {
          id: "last",
          header: "Last",
          cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.last)}</span>,
        },
        {
          id: "mkt",
          header: "Mkt",
          cell: ({ row }) => (
            <span className="tabular-nums">{formatMoney(row.original.market_value)}</span>
          ),
        },
        {
          id: "upnl",
          header: "Unrl",
          cell: ({ row }) => (
            <span className={`tabular-nums ${pnlClass(row.original.unrealized_pnl)}`}>
              {formatMoney(row.original.unrealized_pnl)}
            </span>
          ),
        },
        {
          id: "rpnl",
          header: "Rlzd",
          cell: ({ row }) => (
            <span className={`tabular-nums ${pnlClass(row.original.realized_pnl)}`}>
              {formatMoney(row.original.realized_pnl)}
            </span>
          ),
        },
        {
          id: "day",
          header: "Day",
          cell: ({ row }) => (
            <span className={`tabular-nums ${pnlClass(row.original.day_pnl)}`}>
              {formatMoney(row.original.day_pnl)}
            </span>
          ),
        },
        {
          id: "wt",
          header: "Wt",
          cell: ({ row }) => (
            <span className="tabular-nums">{row.original.weight_pct.toFixed(1)}%</span>
          ),
        },
        {
          id: "close",
          header: "",
          cell: ({ row }) => (
            <button
              type="button"
              className="border border-border px-1 text-primary"
              data-testid={`portfolio-close-${row.original.symbol}`}
              onClick={() => {
                setActiveSymbol(row.original.symbol);
                applyPrefill(
                  closePositionDraft({ symbol: row.original.symbol, qty: row.original.qty }),
                );
                if (dockApi) {
                  focusPanel(dockApi, "orderTicket");
                }
              }}
            >
              Close
            </button>
          ),
        },
      ],
      [applyPrefill, dockApi, setActiveSymbol],
    ),
    getCoreRowModel: getCoreRowModel(),
  });
  const virtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 8,
  });

  return (
    <div
      className="flex h-full flex-col gap-1 overflow-hidden bg-background p-1 text-xs text-foreground"
      data-testid="panel-portfolio"
    >
      {status === "loading" ? (
        <p className="text-muted-foreground" data-testid="portfolio-loading">
          Loading portfolio…
        </p>
      ) : null}
      {status === "error" ? (
        <p className="text-down" data-testid="portfolio-error">
          {error}
        </p>
      ) : null}

      {live ? (
        <div
          className="grid grid-cols-4 gap-1 border border-border p-1"
          data-testid="portfolio-header"
        >
          <Kpi label="Equity" value={formatMoney(live.account.equity)} testId="portfolio-equity" />
          <Kpi label="Cash" value={formatMoney(live.account.cash)} testId="portfolio-cash" />
          <Kpi
            label="Buying power"
            value={formatMoney(live.account.buying_power)}
            testId="portfolio-buying-power"
          />
          <Kpi
            label="Day"
            value={formatMoney(live.account.day_pnl)}
            testId="portfolio-day-pnl"
            tone={pnlClass(live.account.day_pnl)}
          />
        </div>
      ) : null}

      {status === "empty" ? (
        <p className="text-muted-foreground" data-testid="portfolio-empty">
          No open positions
        </p>
      ) : null}

      {status === "ready" ? (
        <div
          className="min-h-[96px] flex-1 overflow-auto"
          ref={parentRef}
          data-testid="portfolio-grid"
        >
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 bg-card text-muted-foreground">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th key={header.id} className="border-b border-border px-1 py-0.5 font-normal">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {(() => {
                const tableRows = table.getRowModel().rows;
                const virtualRows = virtualizer.getVirtualItems();
                const windowed =
                  tableRows.length > 80 && virtualRows.length > 0
                    ? virtualRows
                        .map((item) => tableRows[item.index])
                        .filter((row): row is (typeof tableRows)[number] => row !== undefined)
                    : tableRows;
                return windowed.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer"
                    data-testid={`portfolio-row-${row.original.symbol}`}
                    data-unrealized-pct={row.original.unrealized_pnl_pct.toFixed(1)}
                    data-qty={String(row.original.qty)}
                    onClick={() => {
                      setActiveSymbol(row.original.symbol);
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="border-b border-border px-1 py-0.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      ) : null}

      {live ? (
        <div className="grid h-28 shrink-0 grid-cols-3 gap-1">
          <AllocationDonut
            title="Positions"
            slices={live.allocations.by_position}
            testId="portfolio-alloc-position"
          />
          <AllocationDonut
            title="Sectors"
            slices={live.allocations.by_sector}
            testId="portfolio-alloc-sector"
          />
          <div className="flex flex-col border border-border" data-testid="portfolio-equity-curve">
            <div className="flex gap-1 p-1">
              {RANGES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`h-5 border px-1 ${range === item ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                  data-testid={`portfolio-range-${item}`}
                  onClick={() => {
                    setRange(item);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
            {live.snapshots.length === 0 ? (
              <p className="px-1 text-muted-foreground" data-testid="portfolio-curve-empty">
                No snapshots yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={live.snapshots.map((row) => ({ date: row.as_of_date, equity: row.equity }))}
                >
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Line type="monotone" dataKey="equity" stroke="#ffb000" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Kpi(props: {
  label: string;
  value: string;
  testId: string;
  tone?: string;
}): React.JSX.Element {
  return (
    <div>
      <p className="text-muted-foreground">{props.label}</p>
      <p className={`font-mono tabular-nums ${props.tone ?? ""}`} data-testid={props.testId}>
        {props.value}
      </p>
    </div>
  );
}

function AllocationDonut(props: {
  title: string;
  slices: { key: string; market_value: number; weight_pct: number }[];
  testId: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-col border border-border" data-testid={props.testId}>
      <p className="px-1 text-muted-foreground">{props.title}</p>
      {props.slices.length === 0 ? (
        <p className="px-1 text-muted-foreground">—</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={props.slices}
              dataKey="market_value"
              nameKey="key"
              innerRadius={18}
              outerRadius={36}
            >
              {props.slices.map((slice, index) => (
                <Cell key={slice.key} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
