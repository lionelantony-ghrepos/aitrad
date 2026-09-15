"use client";

import { useEffect, useState } from "react";
import { isFeedStale } from "@meridian/rules-engine";
import { nyseSessionState } from "@/lib/market-session";
import { useRealtimeConnection } from "@/lib/realtime/store";

export function StaleWatermark(): React.JSX.Element | null {
  const lastTickMs = useRealtimeConnection((s) => s.lastTickMs);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const session = nyseSessionState(new Date(now));
  const stale = isFeedStale({ lastTickMs, nowMs: now, session });
  if (!stale) {
    return null;
  }
  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 flex items-start justify-end p-1"
      data-testid="stale-watermark"
    >
      <span className="border border-down bg-background/80 px-1 font-mono text-[10px] tracking-widest text-down">
        STALE
      </span>
    </div>
  );
}
