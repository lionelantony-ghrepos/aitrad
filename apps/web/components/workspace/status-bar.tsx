"use client";

import { useEffect, useState } from "react";
import { formatNyClock, nyseSessionState, type NyseSessionState } from "@/lib/market-session";

type StatusBarProps = {
  connection: "live" | "offline";
};

export function StatusBar({ connection }: StatusBarProps): React.JSX.Element {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  const session: NyseSessionState = nyseSessionState(now);
  const clock = formatNyClock(now);

  return (
    <footer
      className="flex h-6 shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-2 font-mono text-[11px] tabular-nums"
      data-testid="status-bar"
    >
      <div className="flex items-center gap-3">
        <span data-testid="market-clock">{clock} ET</span>
        <span
          className={session === "OPEN" ? "text-up" : "text-muted-foreground"}
          data-session={session}
          data-testid="market-session"
        >
          {session}
        </span>
      </div>
      <div
        className="flex items-center gap-1.5"
        data-connection={connection}
        data-testid="connection-dot"
      >
        <span
          className={
            connection === "live"
              ? "inline-block size-1.5 rounded-full bg-up"
              : "inline-block size-1.5 rounded-full bg-down"
          }
          aria-hidden
        />
        <span className="text-muted-foreground">
          {connection === "live" ? "Connected" : "Offline"}
        </span>
      </div>
    </footer>
  );
}
