import { ema, rsi, sma, vwap } from "@meridian/indicators";
import type { MarketBar } from "@meridian/schemas";

export type ChartOverlayId = "sma20" | "sma50" | "sma200" | "ema12" | "ema26" | "vwap" | "rsi14";

export type ChartOverlayState = Record<ChartOverlayId, boolean>;

export const DEFAULT_OVERLAYS: ChartOverlayState = {
  sma20: false,
  sma50: false,
  sma200: false,
  ema12: false,
  ema26: false,
  vwap: false,
  rsi14: false,
};

export type OverlaySeries = Record<ChartOverlayId, Array<number | null>>;

export function computeOverlays(bars: readonly MarketBar[]): OverlaySeries {
  const closes = bars.map((bar) => bar.c);
  return {
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    ema12: ema(closes, 12),
    ema26: ema(closes, 26),
    vwap: vwap(bars),
    rsi14: rsi(closes, 14),
  };
}

export function formatPx(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return value.toFixed(2);
}
