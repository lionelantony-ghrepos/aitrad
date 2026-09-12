import type { OrderSide } from "@meridian/schemas";

export type PositionBook = {
  qty: number;
  avgCost: number;
  realizedPnl: number;
};

export function emptyPosition(): PositionBook {
  return { qty: 0, avgCost: 0, realizedPnl: 0 };
}

function weightedAvg(qtyA: number, costA: number, qtyB: number, costB: number): number {
  const total = qtyA + qtyB;
  if (total === 0) {
    return 0;
  }
  return (qtyA * costA + qtyB * costB) / total;
}

/** Weighted average cost on buys; realized P&L on sells that close a long. */
export function applyFillToPosition(
  position: PositionBook,
  fill: { side: OrderSide; qty: number; price: number },
): PositionBook {
  if (fill.side === "buy") {
    if (position.qty < 0) {
      const cover = Math.min(fill.qty, -position.qty);
      const realized = position.realizedPnl + (position.avgCost - fill.price) * cover;
      const leftover = fill.qty - cover;
      const openQty = position.qty + cover;
      if (leftover === 0) {
        return {
          qty: openQty,
          avgCost: openQty === 0 ? 0 : position.avgCost,
          realizedPnl: realized,
        };
      }
      return { qty: leftover, avgCost: fill.price, realizedPnl: realized };
    }
    const qty = position.qty + fill.qty;
    return {
      qty,
      avgCost: weightedAvg(position.qty, position.avgCost, fill.qty, fill.price),
      realizedPnl: position.realizedPnl,
    };
  }

  if (position.qty > 0) {
    const close = Math.min(fill.qty, position.qty);
    const realized = position.realizedPnl + (fill.price - position.avgCost) * close;
    const leftover = fill.qty - close;
    const openQty = position.qty - close;
    if (leftover === 0) {
      return {
        qty: openQty,
        avgCost: openQty === 0 ? 0 : position.avgCost,
        realizedPnl: realized,
      };
    }
    return { qty: -leftover, avgCost: fill.price, realizedPnl: realized };
  }

  const qty = position.qty - fill.qty;
  const shortQty = Math.abs(position.qty);
  return {
    qty,
    avgCost:
      shortQty === 0 ? fill.price : weightedAvg(shortQty, position.avgCost, fill.qty, fill.price),
    realizedPnl: position.realizedPnl,
  };
}

export function markEquity(
  cash: number,
  positions: readonly { qty: number; symbol: string }[],
  lastBySymbol: Readonly<Record<string, number>>,
): number {
  let equity = cash;
  for (const pos of positions) {
    const last = lastBySymbol[pos.symbol];
    if (last === undefined || !Number.isFinite(last)) {
      continue;
    }
    equity += pos.qty * last;
  }
  return equity;
}
