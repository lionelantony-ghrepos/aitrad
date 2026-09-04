"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { QuoteTick } from "@meridian/schemas";
import { createQuoteCoalescer } from "./coalesce";
import { appendSparkline } from "./sparkline";
import type { QuotesTransport } from "./transport";

export type QuoteBoardRow = {
  instrument_id: string;
  symbol?: string;
  bid: number;
  ask: number;
  last: number;
  prev_close: number;
  volume: number;
  ts: string;
  sparkline: number[];
  flash: "up" | "down" | null;
};

export function useQuotes(
  symbols: readonly string[],
  options: {
    transport: QuotesTransport;
    instrumentIds: readonly string[];
    seed?: readonly QuoteTick[];
  },
): { quotes: Record<string, QuoteBoardRow> } {
  const symbolSet = useMemo(() => new Set(symbols.map((s) => s.toUpperCase())), [symbols]);
  const idSet = useMemo(() => new Set(options.instrumentIds), [options.instrumentIds]);
  const [quotes, setQuotes] = useState<Record<string, QuoteBoardRow>>({});
  const quotesRef = useRef(quotes);
  quotesRef.current = quotes;

  useEffect(() => {
    if (!options.seed || options.seed.length === 0) {
      return;
    }
    setQuotes((prev) => {
      const next = { ...prev };
      for (const tick of options.seed ?? []) {
        next[tick.instrument_id] = {
          instrument_id: tick.instrument_id,
          symbol: tick.symbol,
          bid: tick.bid,
          ask: tick.ask,
          last: tick.last,
          prev_close: tick.prev_close,
          volume: tick.volume,
          ts: tick.ts,
          sparkline: appendSparkline([], tick.last),
          flash: null,
        };
      }
      return next;
    });
  }, [options.seed]);

  useEffect(() => {
    const coalescer = createQuoteCoalescer({
      onFlush: (ticks) => {
        setQuotes((prev) => {
          const next = { ...prev };
          for (const tick of ticks) {
            const prior = prev[tick.instrument_id];
            let flash: "up" | "down" | null = null;
            if (prior && tick.last !== prior.last) {
              flash = tick.last > prior.last ? "up" : "down";
            }
            next[tick.instrument_id] = {
              instrument_id: tick.instrument_id,
              symbol: tick.symbol ?? prior?.symbol,
              bid: tick.bid,
              ask: tick.ask,
              last: tick.last,
              prev_close: tick.prev_close,
              volume: tick.volume,
              ts: tick.ts,
              sparkline: appendSparkline(prior?.sparkline ?? [], tick.last),
              flash,
            };
          }
          return next;
        });
      },
    });

    const unsubscribe = options.transport.subscribe((batch) => {
      const filtered = batch.ticks.filter((tick) => {
        if (idSet.has(tick.instrument_id)) {
          return true;
        }
        return tick.symbol !== undefined && symbolSet.has(tick.symbol.toUpperCase());
      });
      if (filtered.length > 0) {
        coalescer.push(filtered);
      }
    });

    return () => {
      unsubscribe();
      coalescer.dispose();
    };
  }, [options.transport, symbolSet, idSet]);

  return { quotes };
}
