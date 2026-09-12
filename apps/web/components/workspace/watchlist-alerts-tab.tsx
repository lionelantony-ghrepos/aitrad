"use client";

import { useCallback, useEffect, useState } from "react";
import type { AlertInstance, AlertKind, AlertRule } from "@meridian/schemas";
import {
  createAlertRuleAction,
  deleteAlertRuleAction,
  listAlertRulesAction,
  listAlertsAction,
  setAlertRuleActiveAction,
} from "@/app/actions/alerts";
import { useSymbolContext } from "@/lib/symbol-context";

const KINDS: { id: AlertKind; label: string; needsThreshold: boolean }[] = [
  { id: "price_cross_above", label: "Price crosses above", needsThreshold: true },
  { id: "price_cross_below", label: "Price crosses below", needsThreshold: true },
  { id: "pct_chg", label: "%chg >", needsThreshold: true },
  { id: "volume", label: "Volume >", needsThreshold: true },
  { id: "rsi", label: "RSI <", needsThreshold: true },
  { id: "news_sentiment", label: "Negative news", needsThreshold: false },
];

type WatchlistAlertsTabProps = {
  defaultSymbol: string | null;
  onReady?: () => void;
};

export function WatchlistAlertsTab({
  defaultSymbol,
  onReady,
}: WatchlistAlertsTabProps): React.JSX.Element {
  const activeSymbol = useSymbolContext((s) => s.activeSymbol);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<AlertInstance[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<AlertKind>("price_cross_above");
  const [threshold, setThreshold] = useState("200");
  const [symbol, setSymbol] = useState(defaultSymbol ?? activeSymbol ?? "AAPL");

  const load = useCallback(async () => {
    const [ruleResult, histResult] = await Promise.all([
      listAlertRulesAction(),
      listAlertsAction(),
    ]);
    if (!ruleResult.ok) {
      setStatus("error");
      setError(ruleResult.message);
      return;
    }
    if (!histResult.ok) {
      setStatus("error");
      setError(histResult.message);
      return;
    }
    setRules(ruleResult.data);
    setHistory(histResult.data);
    setStatus("ready");
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (defaultSymbol) {
      setSymbol(defaultSymbol);
    }
  }, [defaultSymbol]);

  async function onCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const needsThreshold = KINDS.find((row) => row.id === kind)?.needsThreshold ?? true;
    const result = await createAlertRuleAction({
      kind,
      symbol: symbol.trim().toUpperCase(),
      threshold: needsThreshold ? Number(threshold) : undefined,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setRules((prev) => [...prev, result.data]);
  }

  async function onToggle(rule: AlertRule): Promise<void> {
    const result = await setAlertRuleActiveAction(rule.id, !rule.active);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRules((prev) => prev.map((row) => (row.id === rule.id ? result.data : row)));
  }

  async function onDelete(id: string): Promise<void> {
    const result = await deleteAlertRuleAction(id);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRules((prev) => prev.filter((row) => row.id !== id));
  }

  if (status === "loading") {
    return <p className="p-1 text-muted-foreground">Loading alerts…</p>;
  }
  if (status === "error") {
    return <p className="p-1 text-down">{error ?? "Unable to load alerts."}</p>;
  }

  const needsThreshold = KINDS.find((row) => row.id === kind)?.needsThreshold ?? true;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-1" data-testid="watchlist-alerts">
      <form
        className="flex flex-wrap gap-1 border-b border-border pb-1"
        onSubmit={(e) => void onCreate(e)}
      >
        <input
          className="w-16 border border-input bg-card px-1 font-mono text-foreground"
          data-testid="alert-create-symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          aria-label="Alert symbol"
        />
        <select
          className="border border-input bg-card px-1 text-foreground"
          data-testid="alert-create-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as AlertKind)}
        >
          {KINDS.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </select>
        {needsThreshold ? (
          <input
            className="w-16 border border-input bg-card px-1 font-mono tabular-nums text-foreground"
            data-testid="alert-create-threshold"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            aria-label="Alert threshold"
          />
        ) : null}
        <button
          type="submit"
          className="bg-primary px-1 text-primary-foreground"
          data-testid="alert-create-submit"
        >
          Create
        </button>
      </form>
      {error ? (
        <p className="text-down" data-testid="alert-error">
          {error}
        </p>
      ) : null}
      {rules.length === 0 ? (
        <p className="py-1 text-muted-foreground">No alert rules yet.</p>
      ) : (
        <ul className="space-y-0.5 py-1">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-center justify-between gap-1"
              data-testid={`alert-rule-${rule.kind}`}
              data-alert-id={rule.id}
              data-active={rule.active ? "1" : "0"}
            >
              <span className={rule.active ? "text-foreground" : "text-muted-foreground"}>
                {rule.name}
              </span>
              <span className="flex gap-1">
                <button
                  type="button"
                  className="text-muted-foreground"
                  data-testid={`alert-toggle-${rule.kind}`}
                  onClick={() => void onToggle(rule)}
                >
                  {rule.active ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  className="text-down"
                  data-testid={`alert-delete-${rule.kind}`}
                  onClick={() => void onDelete(rule.id)}
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="border-t border-border pt-1 text-[10px] uppercase text-muted-foreground">
        Fired
      </p>
      {history.length === 0 ? (
        <p className="text-muted-foreground" data-testid="alert-history-empty">
          No fired alerts.
        </p>
      ) : (
        <ul data-testid="alert-history">
          {history.map((row) => (
            <li key={row.id} className="font-mono tabular-nums" data-testid="alert-history-row">
              {row.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
