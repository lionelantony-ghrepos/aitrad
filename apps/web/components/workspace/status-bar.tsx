"use client";

import { useEffect, useState } from "react";
import { formatNyClock, nyseSessionState, type NyseSessionState } from "@/lib/market-session";
import { listAlertsAction, markAlertReadAction } from "@/app/actions/alerts";
import { openWatchlistAlertsTab } from "@/lib/alerts/events";
import { useAlertsUi } from "@/lib/alerts/store";
import type { AlertInstance } from "@meridian/schemas";

type StatusBarProps = {
  connection: "live" | "offline";
};

export function StatusBar({ connection }: StatusBarProps): React.JSX.Element {
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AlertInstance[]>([]);
  const unreadCount = useAlertsUi((s) => s.unreadCount);
  const toast = useAlertsUi((s) => s.toast);
  const clearToast = useAlertsUi((s) => s.clearToast);
  const setUnreadCount = useAlertsUi((s) => s.setUnreadCount);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const id = window.setTimeout(() => {
      clearToast();
    }, 4000);
    return () => window.clearTimeout(id);
  }, [toast, clearToast]);

  const session: NyseSessionState = nyseSessionState(now);
  const clock = formatNyClock(now);

  async function onBell(): Promise<void> {
    setOpen((prev) => !prev);
    openWatchlistAlertsTab();
    const result = await listAlertsAction();
    if (result.ok) {
      setItems(result.data);
    }
  }

  async function onMarkRead(id: string): Promise<void> {
    const result = await markAlertReadAction(id, true);
    if (!result.ok) {
      return;
    }
    setItems((prev) => prev.map((row) => (row.id === id ? result.data : row)));
    const listed = await listAlertsAction();
    if (listed.ok) {
      setUnreadCount(listed.data.filter((row) => !row.read).length);
    }
  }

  return (
    <footer
      className="relative flex h-6 shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-2 font-mono text-[11px] tabular-nums"
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
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-1 text-primary"
            data-testid="alert-bell"
            aria-label="Notification center"
            onClick={() => void onBell()}
          >
            Bell
            <span
              className="rounded-sm bg-secondary px-1 tabular-nums text-foreground"
              data-testid="alert-unread-badge"
            >
              {unreadCount}
            </span>
          </button>
          {open ? (
            <div
              className="absolute bottom-6 right-0 z-50 w-64 border border-border bg-card p-1 text-foreground"
              data-testid="alert-center"
            >
              {items.length === 0 ? (
                <p className="text-muted-foreground">No alerts.</p>
              ) : (
                <ul>
                  {items.slice(0, 8).map((row) => (
                    <li key={row.id} className="flex justify-between gap-1">
                      <span>{row.message}</span>
                      {!row.read ? (
                        <button type="button" onClick={() => void onMarkRead(row.id)}>
                          Read
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
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
      </div>
      {toast ? (
        <div
          className="absolute bottom-7 right-2 z-50 border border-border bg-card px-2 py-1 text-foreground"
          data-testid="alert-toast"
        >
          {toast.message}
        </div>
      ) : null}
    </footer>
  );
}
