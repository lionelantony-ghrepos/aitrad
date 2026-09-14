"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteMonitorAction,
  listMonitorAlertsAction,
  listMonitorsAction,
  pauseMonitorAction,
  resetMonitorThrottleAction,
} from "@/app/actions/monitors";
import { explainCompiledMonitor } from "@meridian/copilot";
import type { AlertInstance, Monitor } from "@meridian/schemas";

export function CopilotMonitorsTab(): React.JSX.Element {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Monitor[]>([]);
  const [history, setHistory] = useState<AlertInstance[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [explainId, setExplainId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await listMonitorsAction();
    if (!result.ok) {
      setStatus("error");
      setError(result.message);
      return;
    }
    setRows(result.data);
    setStatus("ready");
    setError(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function openHistory(id: string): Promise<void> {
    setSelected(id);
    const listed = await listMonitorAlertsAction(id);
    if (listed.ok) {
      setHistory(listed.data);
    }
  }

  if (status === "loading") {
    return (
      <p className="text-muted-foreground" data-testid="copilot-monitors-loading">
        Loading monitors…
      </p>
    );
  }
  if (status === "error") {
    return (
      <p className="text-down" data-testid="copilot-monitors-error">
        {error}
      </p>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground" data-testid="copilot-monitors-empty">
        No monitors. Ask Copilot to watch a condition.
      </p>
    );
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto"
      data-testid="copilot-monitors"
    >
      {rows.map((row) => (
        <article
          key={row.id}
          className="border border-border p-1"
          data-testid={`monitor-row-${row.id}`}
          data-active={row.active ? "1" : "0"}
        >
          <p className="text-primary">{row.name}</p>
          <p className="text-muted-foreground">{row.nl_instruction}</p>
          <p className="tabular-nums text-muted-foreground">cadence {row.cadence}</p>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className="border border-border px-1 text-primary"
              data-testid={`monitor-pause-${row.id}`}
              onClick={() => {
                void pauseMonitorAction(row.id, !row.active).then(() => refresh());
              }}
            >
              {row.active ? "Pause" : "Resume"}
            </button>
            <button
              type="button"
              className="border border-border px-1 text-primary"
              data-testid={`monitor-reset-throttle-${row.id}`}
              onClick={() => {
                void resetMonitorThrottleAction(row.id).then(() => refresh());
              }}
            >
              Reset throttle
            </button>
            <button
              type="button"
              className="border border-border px-1 text-primary"
              data-testid={`monitor-explain-${row.id}`}
              onClick={() => {
                setExplainId((current) => (current === row.id ? null : row.id));
              }}
            >
              Explain what this watches
            </button>
            <button
              type="button"
              className="border border-border px-1 text-primary"
              data-testid={`monitor-history-${row.id}`}
              onClick={() => {
                void openHistory(row.id);
              }}
            >
              History
            </button>
            <button
              type="button"
              className="border border-down px-1 text-down"
              data-testid={`monitor-delete-${row.id}`}
              onClick={() => {
                void deleteMonitorAction(row.id).then(() => refresh());
              }}
            >
              Delete
            </button>
          </div>
          {explainId === row.id ? (
            <p className="text-foreground" data-testid={`monitor-explain-text-${row.id}`}>
              {explainCompiledMonitor(row.compiled_condition, row.scope)}
            </p>
          ) : null}
          {selected === row.id ? (
            <ul className="mt-1" data-testid={`monitor-history-list-${row.id}`}>
              {history.length === 0 ? (
                <li className="text-muted-foreground">No triggers yet.</li>
              ) : (
                history.map((item) => (
                  <li key={item.id} className="text-foreground" data-testid="monitor-history-item">
                    {item.message}
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  );
}
