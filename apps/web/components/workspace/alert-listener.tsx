"use client";

import { useEffect, useMemo, useRef } from "react";
import type { AlertInstance, QuoteTick } from "@meridian/schemas";
import { evaluateAlertsOnTicksAction, listAlertsAction } from "@/app/actions/alerts";
import { useAlertsUi } from "@/lib/alerts/store";
import { createInsforgeAlertsTransport, createWindowAlertsTransport } from "@/lib/alerts/transport";
import { createInsforgeQuotesTransport, createWindowQuotesTransport } from "@/lib/quotes/transport";
import { useWorkspaceRuntime } from "@/lib/workspace-runtime";

function isRefresh(event: AlertInstance | { kind: "refresh" }): event is { kind: "refresh" } {
  return "kind" in event && event.kind === "refresh";
}

export function AlertListener(): React.JSX.Element | null {
  const { e2eFeed, userId } = useWorkspaceRuntime();
  const setUnreadCount = useAlertsUi((s) => s.setUnreadCount);
  const showToast = useAlertsUi((s) => s.showToast);
  const knownIds = useRef(new Set<string>());

  const quotesTransport = useMemo(
    () => (e2eFeed ? createWindowQuotesTransport() : createInsforgeQuotesTransport()),
    [e2eFeed],
  );
  const alertsTransport = useMemo(
    () =>
      e2eFeed || !userId ? createWindowAlertsTransport() : createInsforgeAlertsTransport(userId),
    [e2eFeed, userId],
  );

  useEffect(() => {
    void listAlertsAction().then((result) => {
      if (!result.ok) {
        return;
      }
      for (const row of result.data) {
        knownIds.current.add(row.id);
      }
      setUnreadCount(result.data.filter((row) => !row.read).length);
    });
  }, [setUnreadCount]);

  useEffect(() => {
    const unsub = alertsTransport.subscribe((event) => {
      if (isRefresh(event)) {
        void listAlertsAction().then((result) => {
          if (!result.ok) {
            return;
          }
          const unread = result.data.filter((row) => !row.read);
          setUnreadCount(unread.length);
          for (const row of result.data) {
            if (!knownIds.current.has(row.id)) {
              knownIds.current.add(row.id);
              showToast(row);
            }
          }
        });
        return;
      }
      if (!knownIds.current.has(event.id)) {
        knownIds.current.add(event.id);
        showToast(event);
      }
      void listAlertsAction().then((result) => {
        if (result.ok) {
          setUnreadCount(result.data.filter((row) => !row.read).length);
        }
      });
    });
    return unsub;
  }, [alertsTransport, setUnreadCount, showToast]);

  useEffect(() => {
    if (!e2eFeed) {
      return;
    }
    const unsub = quotesTransport.subscribe((batch) => {
      const ticks: QuoteTick[] = batch.ticks;
      void evaluateAlertsOnTicksAction(ticks).then((result) => {
        if (!result.ok || result.data.length === 0) {
          return;
        }
        for (const row of result.data) {
          if (!knownIds.current.has(row.id)) {
            knownIds.current.add(row.id);
            showToast(row);
          }
        }
        void listAlertsAction().then((listed) => {
          if (listed.ok) {
            setUnreadCount(listed.data.filter((row) => !row.read).length);
          }
        });
      });
    });
    return unsub;
  }, [e2eFeed, quotesTransport, setUnreadCount, showToast]);

  return null;
}
