"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UTCTimestamp } from "lightweight-charts";
import type { IDockviewPanelProps } from "dockview-react";
import type { ChartRange, MarketBar } from "@meridian/schemas";
import { fetchChartBars } from "@/lib/chart/fetch-bars";
import {
  CHART_RANGES,
  applyQuoteToCandles,
  timeframeForRange,
  type QuoteForCandle,
} from "@/lib/chart/range";
import { createGenerationGate } from "@/lib/chart/stale-request";
import {
  DEFAULT_OVERLAYS,
  computeOverlays,
  formatPx,
  type ChartOverlayId,
  type ChartOverlayState,
} from "@/lib/chart/overlays";
import { useQuotes } from "@/lib/quotes/use-quotes";
import { createInsforgeQuotesTransport, createWindowQuotesTransport } from "@/lib/quotes/transport";
import { useSymbolContext } from "@/lib/symbol-context";
import { useWorkspaceRuntime } from "@/lib/workspace-runtime";

const OVERLAY_BUTTONS: { id: ChartOverlayId; label: string }[] = [
  { id: "sma20", label: "SMA 20" },
  { id: "sma50", label: "SMA 50" },
  { id: "sma200", label: "SMA 200" },
  { id: "ema12", label: "EMA 12" },
  { id: "ema26", label: "EMA 26" },
  { id: "vwap", label: "VWAP" },
  { id: "rsi14", label: "RSI 14" },
];

const LINE_COLORS: Partial<Record<ChartOverlayId, string>> = {
  sma20: "#ffb000",
  sma50: "#00d4ff",
  sma200: "#c084fc",
  ema12: "#f59e0b",
  ema26: "#38bdf8",
  vwap: "#e8edf2",
};

function toUtc(ts: string): UTCTimestamp {
  return Math.floor(Date.parse(ts) / 1000) as UTCTimestamp;
}

function barToCandle(bar: MarketBar): {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
} {
  return {
    time: toUtc(bar.ts),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
  };
}

function linePoints(
  bars: readonly MarketBar[],
  values: Array<number | null>,
): { time: UTCTimestamp; value: number }[] {
  const points: { time: UTCTimestamp; value: number }[] = [];
  for (let i = 0; i < bars.length; i += 1) {
    const bar = bars[i];
    const value = values[i];
    if (!bar || value === null || value === undefined) {
      continue;
    }
    points.push({ time: toUtc(bar.ts), value });
  }
  return points;
}

export function ChartPanel(props: IDockviewPanelProps): React.JSX.Element {
  const { e2eFeed } = useWorkspaceRuntime();
  const transport = useMemo(
    () => (e2eFeed ? createWindowQuotesTransport() : createInsforgeQuotesTransport()),
    [e2eFeed],
  );
  const activeSymbol = useSymbolContext((s) => s.activeSymbol);
  const [range, setRange] = useState<ChartRange>("1D");
  const [overlays, setOverlays] = useState<ChartOverlayState>(DEFAULT_OVERLAYS);
  const [bars, setBars] = useState<MarketBar[]>([]);
  const [instrumentId, setInstrumentId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gateRef = useRef(createGenerationGate());
  const barsRef = useRef(bars);
  barsRef.current = bars;

  const { quotes } = useQuotes(activeSymbol ? [activeSymbol] : [], {
    transport,
    instrumentIds: instrumentId ? [instrumentId] : [],
  });

  useEffect(() => {
    const handle = gateRef.current.next();
    if (!activeSymbol) {
      setBars([]);
      setInstrumentId(null);
      setStatus("idle");
      setError(null);
      return () => {
        handle.abort.abort();
      };
    }
    setStatus("loading");
    setError(null);
    setBars([]);
    void fetchChartBars({ symbol: activeSymbol, range }, handle.abort.signal).then((result) => {
      if (!handle.isCurrent() || handle.abort.signal.aborted) {
        return;
      }
      if (!result.ok) {
        if (result.message === "aborted") {
          return;
        }
        setStatus("error");
        setError(result.message);
        return;
      }
      setInstrumentId(result.data.instrument_id);
      setBars(result.data.bars);
      setStatus(result.data.bars.length === 0 ? "empty" : "ready");
    });
    return () => {
      handle.abort.abort();
    };
  }, [activeSymbol, range]);

  useEffect(() => {
    if (!instrumentId) {
      return;
    }
    const row = quotes[instrumentId];
    if (!row) {
      return;
    }
    const quote: QuoteForCandle = {
      instrument_id: instrumentId,
      last: row.last,
      volume: row.volume,
      ts: row.ts,
    };
    setBars((prev) => (prev.length === 0 ? prev : applyQuoteToCandles(prev, quote)));
  }, [instrumentId, quotes]);

  const overlaySeries = useMemo(() => computeOverlays(bars), [bars]);
  const legendIndex = hoverIndex ?? (bars.length > 0 ? bars.length - 1 : null);
  const legendBar = legendIndex === null ? undefined : bars[legendIndex];

  const toggleOverlay = useCallback((id: ChartOverlayId) => {
    setOverlays((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || status !== "ready" || bars.length === 0) {
      return;
    }
    let disposed = false;
    let chart:
      | { remove: () => void; applyOptions: (o: { width: number; height: number }) => void }
      | undefined;
    const timeMap: UTCTimestamp[] = bars.map((bar) => toUtc(bar.ts));

    void import("lightweight-charts").then((lc) => {
      if (disposed || !hostRef.current) {
        return;
      }
      const instance = lc.createChart(hostRef.current, {
        autoSize: true,
        layout: {
          background: { color: "#0a0e14" },
          textColor: "#8b9bb4",
          fontFamily: "ui-monospace, monospace",
        },
        grid: {
          vertLines: { color: "#243044" },
          horzLines: { color: "#243044" },
        },
        rightPriceScale: { borderColor: "#243044" },
        timeScale: { borderColor: "#243044", timeVisible: range === "1D" },
        crosshair: { mode: 0 },
      });
      chart = instance;
      const candles = instance.addSeries(lc.CandlestickSeries, {
        upColor: "#3dd68c",
        downColor: "#f44747",
        borderVisible: false,
        wickUpColor: "#3dd68c",
        wickDownColor: "#f44747",
      });
      candles.setData(bars.map(barToCandle));
      const volume = instance.addSeries(lc.HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
      });
      instance.priceScale("vol").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volume.setData(
        bars.map((bar) => ({
          time: toUtc(bar.ts),
          value: bar.v,
          color: bar.c >= bar.o ? "#3dd68c66" : "#f4474766",
        })),
      );

      (["sma20", "sma50", "sma200", "ema12", "ema26", "vwap"] as const).forEach((id) => {
        if (!overlays[id]) {
          return;
        }
        const line = instance.addSeries(lc.LineSeries, {
          color: LINE_COLORS[id] ?? "#ffb000",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        line.setData(linePoints(bars, overlaySeries[id]));
      });

      if (overlays.rsi14) {
        const rsiPane = instance.addPane();
        const rsiSeries = rsiPane.addSeries(lc.LineSeries, {
          color: "#ffb000",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        rsiSeries.setData(linePoints(bars, overlaySeries.rsi14));
      }

      instance.subscribeCrosshairMove((param) => {
        if (!param.time) {
          setHoverIndex(null);
          return;
        }
        const t = typeof param.time === "number" ? param.time : null;
        if (t === null) {
          setHoverIndex(null);
          return;
        }
        const idx = timeMap.lastIndexOf(t);
        setHoverIndex(idx === -1 ? null : idx);
      });
    });

    return () => {
      disposed = true;
      chart?.remove();
    };
  }, [bars, overlays, overlaySeries, range, status]);

  const timeframe = timeframeForRange(range);

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-background text-xs text-foreground"
      data-testid="panel-chart"
      data-dock-id={props.api.id}
      data-range={range}
      data-timeframe={timeframe}
      data-rsi={overlays.rsi14 ? "on" : "off"}
      data-last-close={legendBar ? formatPx(legendBar.c) : ""}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-1">
        <span className="font-mono text-primary tabular-nums" data-testid="chart-symbol">
          {activeSymbol ?? "—"}
        </span>
        {CHART_RANGES.map((item) => (
          <button
            key={item}
            type="button"
            className={
              item === range
                ? "rounded-sm bg-primary px-1.5 py-0.5 font-mono text-primary-foreground"
                : "rounded-sm px-1.5 py-0.5 font-mono text-muted-foreground hover:bg-muted"
            }
            data-testid={`chart-range-${item}`}
            aria-pressed={item === range}
            onClick={() => {
              setRange(item);
            }}
          >
            {item}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        {OVERLAY_BUTTONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              overlays[item.id]
                ? "rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-accent"
                : "rounded-sm px-1.5 py-0.5 font-mono text-muted-foreground hover:bg-muted"
            }
            data-testid={`chart-indicator-${item.id}`}
            aria-pressed={overlays[item.id]}
            onClick={() => {
              toggleOverlay(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        className="border-b border-border px-1 py-0.5 font-mono tabular-nums text-muted-foreground"
        data-testid="chart-legend"
      >
        {legendBar ? (
          <>
            O {formatPx(legendBar.o)} H {formatPx(legendBar.h)} L {formatPx(legendBar.l)} C{" "}
            {formatPx(legendBar.c)} V {formatPx(legendBar.v)}
            {overlays.sma20 ? ` SMA20 ${formatPx(overlaySeries.sma20[legendIndex ?? 0])}` : ""}
            {overlays.sma50 ? ` SMA50 ${formatPx(overlaySeries.sma50[legendIndex ?? 0])}` : ""}
            {overlays.sma200 ? ` SMA200 ${formatPx(overlaySeries.sma200[legendIndex ?? 0])}` : ""}
            {overlays.ema12 ? ` EMA12 ${formatPx(overlaySeries.ema12[legendIndex ?? 0])}` : ""}
            {overlays.ema26 ? ` EMA26 ${formatPx(overlaySeries.ema26[legendIndex ?? 0])}` : ""}
            {overlays.vwap ? ` VWAP ${formatPx(overlaySeries.vwap[legendIndex ?? 0])}` : ""}
            {overlays.rsi14 ? ` RSI ${formatPx(overlaySeries.rsi14[legendIndex ?? 0])}` : ""}
          </>
        ) : (
          "—"
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        {status === "idle" ? (
          <p className="p-2 text-muted-foreground" data-testid="chart-idle">
            Select a symbol from the watchlist.
          </p>
        ) : null}
        {status === "loading" ? (
          <p className="p-2 text-muted-foreground" data-testid="chart-loading">
            Loading…
          </p>
        ) : null}
        {status === "error" ? (
          <p className="p-2 text-down" data-testid="chart-error">
            {error}
          </p>
        ) : null}
        {status === "empty" ? (
          <p className="p-2 text-muted-foreground" data-testid="chart-empty">
            No bars for this range.
          </p>
        ) : null}
        <div
          ref={hostRef}
          className="absolute inset-0"
          data-testid="chart-canvas"
          data-rsi-pane={overlays.rsi14 ? "on" : "off"}
          hidden={status !== "ready"}
        />
      </div>
    </div>
  );
}
