"use client";

import { useEffect, useState } from "react";
import { healthSnapshotAction } from "@/app/actions/health";
import type { HealthSnapshot } from "@meridian/schemas";

export function HealthAdminConsole(): React.JSX.Element {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HealthSnapshot | null>(null);

  useEffect(() => {
    void healthSnapshotAction().then((result) => {
      if (!result.ok) {
        setStatus("error");
        setError(result.message);
        return;
      }
      setData(result.data);
      setStatus("ready");
    });
  }, []);

  if (status === "loading") {
    return (
      <p className="p-3 text-xs text-muted-foreground" data-testid="health-loading">
        Loading health…
      </p>
    );
  }
  if (status === "error" || !data) {
    return (
      <p className="p-3 text-xs text-destructive" data-testid="health-error">
        {error ?? "Unavailable"}
      </p>
    );
  }
  if (data.functions.length === 0 && !data.feed.ts) {
    return (
      <p className="p-3 text-xs text-muted-foreground" data-testid="health-empty">
        No telemetry samples yet.
      </p>
    );
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3 font-mono text-xs"
      data-testid="health-dashboard"
    >
      <section>
        <h2 className="mb-1 text-[10px] tracking-[0.2em] text-primary uppercase">Feed heartbeat</h2>
        <p data-testid="health-feed">
          {data.feed.session ?? "—"} · {data.feed.ts ?? "no beat"} · age{" "}
          <span className="tabular-nums">{data.feed.age_ms ?? "—"}</span> ms
        </p>
      </section>
      <section>
        <h2 className="mb-1 text-[10px] tracking-[0.2em] text-primary uppercase">Realtime</h2>
        <p data-testid="health-realtime">
          live {data.realtime.live} · reconnecting {data.realtime.reconnecting} · offline{" "}
          {data.realtime.offline} · connecting {data.realtime.connecting}
        </p>
      </section>
      <section>
        <h2 className="mb-1 text-[10px] tracking-[0.2em] text-primary uppercase">
          Function latency
        </h2>
        <table className="w-full border-collapse tabular-nums">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th>fn</th>
              <th>n</th>
              <th>p50</th>
              <th>p95</th>
              <th>p99</th>
            </tr>
          </thead>
          <tbody>
            {data.functions.map((row) => (
              <tr key={row.fn} data-testid="health-fn-row">
                <td>{row.fn}</td>
                <td>{row.count}</td>
                <td>{row.p50_ms ?? "—"}</td>
                <td>{row.p95_ms ?? "—"}</td>
                <td>{row.p99_ms ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
