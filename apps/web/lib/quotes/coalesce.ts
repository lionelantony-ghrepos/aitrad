import type { QuoteTick } from "@meridian/schemas";

/** Architecture §9 client render cap (not a decision-table cell). */
export const MAX_QUOTE_RENDERS_PER_SEC = 4;

export const QUOTE_FLUSH_INTERVAL_MS = 1000 / MAX_QUOTE_RENDERS_PER_SEC;

export type QuoteCoalescer = {
  push: (ticks: readonly QuoteTick[]) => void;
  dispose: () => void;
};

export function createQuoteCoalescer(options: {
  maxFlushesPerSec?: number;
  onFlush: (ticks: QuoteTick[]) => void;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}): QuoteCoalescer {
  const maxFlushesPerSec = options.maxFlushesPerSec ?? MAX_QUOTE_RENDERS_PER_SEC;
  const intervalMs = 1000 / maxFlushesPerSec;
  const schedule = options.setTimeoutFn ?? setTimeout;
  const cancel = options.clearTimeoutFn ?? clearTimeout;
  const pending = new Map<string, QuoteTick>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush(): void {
    timer = null;
    if (pending.size === 0) {
      return;
    }
    const ticks = [...pending.values()];
    pending.clear();
    options.onFlush(ticks);
  }

  return {
    push(ticks: readonly QuoteTick[]): void {
      for (const tick of ticks) {
        pending.set(tick.instrument_id, tick);
      }
      if (timer !== null) {
        return;
      }
      timer = schedule(flush, intervalMs);
    },
    dispose(): void {
      if (timer !== null) {
        cancel(timer);
        timer = null;
      }
      pending.clear();
    },
  };
}
