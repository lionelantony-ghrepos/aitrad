"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import type { DesProfile } from "@meridian/schemas";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getDesProfileAction } from "@/app/actions/des";
import { keyStatsForDisplay, week52MarkerPct } from "@/lib/des/view";
import { useQuotes } from "@/lib/quotes/use-quotes";
import { createInsforgeQuotesTransport, createWindowQuotesTransport } from "@/lib/quotes/transport";
import { useSymbolContext } from "@/lib/symbol-context";
import { useWorkspaceRuntime } from "@/lib/workspace-runtime";

function formatPx(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DesPanel(props: IDockviewPanelProps): React.JSX.Element {
  const { e2eFeed } = useWorkspaceRuntime();
  const activeSymbol = useSymbolContext((s) => s.activeSymbol);
  const setActiveSymbol = useSymbolContext((s) => s.setActiveSymbol);
  const transport = useMemo(
    () => (e2eFeed ? createWindowQuotesTransport() : createInsforgeQuotesTransport()),
    [e2eFeed],
  );
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<DesProfile | null>(null);

  const load = useCallback(async (symbol: string) => {
    setStatus("loading");
    const result = await getDesProfileAction(symbol);
    if (!result.ok) {
      setStatus("error");
      setError(result.message);
      setProfile(null);
      return;
    }
    setProfile(result.data);
    setStatus("ready");
    setError(null);
  }, []);

  useEffect(() => {
    if (!activeSymbol) {
      setProfile(null);
      setStatus("idle");
      setError(null);
      return;
    }
    void load(activeSymbol);
  }, [activeSymbol, load]);

  const seed = useMemo(
    () =>
      profile?.quote
        ? [
            {
              instrument_id: profile.instrument.id,
              symbol: profile.instrument.symbol,
              bid: profile.quote.bid,
              ask: profile.quote.ask,
              last: profile.quote.last,
              prev_close: profile.quote.prev_close,
              volume: profile.quote.volume,
              ts: profile.quote.ts,
            },
          ]
        : [],
    [profile],
  );
  const { quotes } = useQuotes(activeSymbol ? [activeSymbol] : [], {
    transport,
    instrumentIds: profile ? [profile.instrument.id] : [],
    seed,
  });
  const liveLast = profile
    ? (quotes[profile.instrument.id]?.last ?? profile.quote?.last)
    : undefined;
  const markerPct = profile
    ? week52MarkerPct({
        ...profile,
        quote: profile.quote
          ? { ...profile.quote, last: liveLast ?? profile.quote.last }
          : profile.quote,
      })
    : 0;

  const stats = profile ? keyStatsForDisplay(profile.fundamentals.metrics) : [];
  const metrics = profile?.fundamentals.metrics;
  const revenueData =
    metrics?.income.revenue_periods.labels.map((label, index) => ({
      label,
      value: metrics.income.revenue_periods.values[index] ?? 0,
    })) ?? [];
  const epsData =
    metrics?.income.eps_periods.labels.map((label, index) => ({
      label,
      value: metrics.income.eps_periods.values[index] ?? 0,
    })) ?? [];
  const analystData = metrics
    ? [
        {
          name: "Street",
          buy: metrics.analyst.buy,
          hold: metrics.analyst.hold,
          sell: metrics.analyst.sell,
        },
      ]
    : [];

  return (
    <div
      className="flex h-full flex-col gap-1 overflow-auto bg-background p-1 text-xs text-foreground"
      data-testid="panel-des"
      data-dock-id={props.api.id}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-primary">Description</p>
        <p className="font-mono text-primary" data-testid="des-symbol">
          {activeSymbol ?? ""}
        </p>
      </div>
      {!activeSymbol ? (
        <p className="text-muted-foreground" data-testid="des-empty">
          Select a symbol or run DES NVDA.
        </p>
      ) : null}
      {status === "loading" ? (
        <p className="text-muted-foreground" data-testid="des-loading">
          Loading…
        </p>
      ) : null}
      {status === "error" ? (
        <p className="text-down" data-testid="des-error">
          {error ?? "Unable to load description"}
        </p>
      ) : null}
      {status === "ready" && profile && metrics ? (
        <>
          <header data-testid="des-header" className="border border-border p-1">
            <p className="font-medium text-foreground">{profile.instrument.name}</p>
            <p className="text-muted-foreground">
              {profile.instrument.exchange} · {profile.instrument.sector ?? "—"} /{" "}
              {profile.instrument.industry ?? "—"}
            </p>
            <div className="mt-1" data-testid="des-range">
              <div className="flex justify-between font-mono tabular-nums text-muted-foreground">
                <span>{metrics.ranges.week52_low.toFixed(2)}</span>
                <span className="text-primary">
                  {liveLast !== undefined ? formatPx(liveLast) : "—"}
                </span>
                <span>{metrics.ranges.week52_high.toFixed(2)}</span>
              </div>
              <div className="relative mt-0.5 h-1.5 bg-muted">
                <div
                  className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-primary"
                  style={{ left: `${markerPct}%` }}
                  data-testid="des-range-marker"
                />
              </div>
            </div>
          </header>
          <div
            className="grid grid-cols-2 gap-px border border-border bg-border"
            data-testid="des-stats"
          >
            {stats.map((row) => (
              <div
                key={row.id}
                className="flex justify-between gap-2 bg-background px-1 py-0.5"
                data-testid={`des-stat-${row.id}`}
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-mono tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1" data-testid="des-financials">
            <div className="h-28 border border-border p-1">
              <p className="text-muted-foreground">Revenue</p>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={revenueData}>
                  <XAxis dataKey="label" tick={{ fill: "#8b9bb4", fontSize: 9 }} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0e14",
                      border: "1px solid #1e2630",
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="value" fill="#ffb000" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-28 border border-border p-1">
              <p className="text-muted-foreground">EPS</p>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={epsData}>
                  <XAxis dataKey="label" tick={{ fill: "#8b9bb4", fontSize: 9 }} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0e14",
                      border: "1px solid #1e2630",
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="value" fill="#00d4ff" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="h-16 border border-border p-1" data-testid="des-analyst">
            <p className="text-muted-foreground">Analyst</p>
            <ResponsiveContainer width="100%" height="70%">
              <BarChart data={analystData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip
                  contentStyle={{
                    background: "#0a0e14",
                    border: "1px solid #1e2630",
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="buy" stackId="a" fill="#3dd68c" />
                <Bar dataKey="hold" stackId="a" fill="#8b9bb4" />
                <Bar dataKey="sell" stackId="a" fill="#f44747" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-1" data-testid="des-peers">
            {profile.peers.length === 0 ? (
              <p className="text-muted-foreground">No industry peers</p>
            ) : (
              profile.peers.map((peer) => (
                <button
                  key={peer.symbol}
                  type="button"
                  className="border border-border px-1 font-mono text-primary hover:border-primary"
                  data-testid={`des-peer-${peer.symbol}`}
                  onClick={() => {
                    setActiveSymbol(peer.symbol);
                  }}
                >
                  {peer.symbol}
                </button>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
