"use client";

import { useEffect, useMemo, useState } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import type { OrderRecord } from "@meridian/schemas";
import { applyPaperTicksAction, listOrdersAction } from "@/app/actions/orders";
import { useQuotes } from "@/lib/quotes/use-quotes";
import {
  createInsforgeQuotesTransport,
  createWindowQuotesTransport,
  parseTickBatchPayload,
  TEST_TICK_BATCH_EVENT,
} from "@/lib/quotes/transport";
import { useSymbolContext } from "@/lib/symbol-context";
import { useWorkspaceRuntime } from "@/lib/workspace-runtime";

export function BlotterPanel(props: IDockviewPanelProps): React.JSX.Element {
  void props;
  const { e2eFeed } = useWorkspaceRuntime();
  const transport = useMemo(
    () => (e2eFeed ? createWindowQuotesTransport() : createInsforgeQuotesTransport()),
    [e2eFeed],
  );
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const activeSymbol = useSymbolContext((s) => s.activeSymbol);

  const symbols = useMemo(() => {
    const fromOrders = orders.map((row) => row.symbol);
    return [...new Set(activeSymbol ? [...fromOrders, activeSymbol] : fromOrders)];
  }, [orders, activeSymbol]);
  const ids = useMemo(() => [...new Set(orders.map((row) => row.instrument_id))], [orders]);
  const { quotes } = useQuotes(symbols, { transport, instrumentIds: ids });

  useEffect(() => {
    let cancelled = false;
    const load = (): void => {
      void listOrdersAction().then((result) => {
        if (cancelled) {
          return;
        }
        if (!result.ok) {
          setStatus("error");
          setError(result.message);
          return;
        }
        setOrders(result.data);
        setStatus(result.data.length === 0 ? "empty" : "ready");
      });
    };
    load();
    const handle = window.setInterval(load, 750);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, []);

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
      });
    };
    window.addEventListener(TEST_TICK_BATCH_EVENT, handler);
    return () => {
      window.removeEventListener(TEST_TICK_BATCH_EVENT, handler);
    };
  }, [e2eFeed]);

  useEffect(() => {
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
  }, [quotes]);

  return (
    <div
      className="flex h-full flex-col gap-1 overflow-auto bg-background p-2 text-xs text-foreground"
      data-testid="panel-blotter"
    >
      <p className="font-medium text-primary">Blotter</p>
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
      {orders.map((order) => (
        <div
          key={order.id}
          className="flex justify-between gap-2 border-b border-border py-1 font-mono tabular-nums"
          data-testid={order.leg_role ? `blotter-leg-${order.leg_role}` : `blotter-row-${order.id}`}
          data-status={order.status}
          data-symbol={order.symbol}
        >
          <span>
            {order.symbol} {order.side} {order.order_type}
            {order.leg_role ? ` ${order.leg_role}` : ""}
          </span>
          <span data-testid={order.leg_role ? `blotter-status-${order.leg_role}` : undefined}>
            {order.status}
          </span>
        </div>
      ))}
    </div>
  );
}
