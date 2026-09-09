import { z } from "zod";
import { portfolioSnapshotSchema } from "./orders";
import { numericSchema, uuidSchema } from "./primitives";

export const equityCurveRangeSchema = z.enum(["1M", "3M", "1Y"]);

export type EquityCurveRange = z.infer<typeof equityCurveRangeSchema>;

export type PositionBookState = {
  qty: number;
  avgCost: number;
  realizedPnl: number;
};

export function emptyPositionBook(): PositionBookState {
  return { qty: 0, avgCost: 0, realizedPnl: 0 };
}

function weightedAvg(qtyA: number, costA: number, qtyB: number, costB: number): number {
  const total = qtyA + qtyB;
  if (total === 0) {
    return 0;
  }
  return (qtyA * costA + qtyB * costB) / total;
}

/** Weighted average cost on adds; realized P&L when reducing or flipping a position. */
export function applyFillToBook(
  position: PositionBookState,
  fill: { side: "buy" | "sell"; qty: number; price: number },
): PositionBookState {
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

export function marketValue(qty: number, last: number): number {
  return qty * last;
}

export function unrealizedPnl(qty: number, avgCost: number, last: number): number {
  return qty * (last - avgCost);
}

export function dayPnl(qty: number, last: number, prevClose: number): number {
  return qty * (last - prevClose);
}

export function costBasis(qty: number, avgCost: number): number {
  return Math.abs(qty) * avgCost;
}

export function unrealizedPnlPct(qty: number, avgCost: number, last: number): number {
  const basis = costBasis(qty, avgCost);
  if (basis === 0) {
    return 0;
  }
  return (unrealizedPnl(qty, avgCost, last) / basis) * 100;
}

export function buyingPowerFromCash(cash: number, reservedCash: number): number {
  return cash - reservedCash;
}

export function markEquityFromPositions(
  cash: number,
  positions: readonly { qty: number; last: number }[],
): number {
  let equity = cash;
  for (const row of positions) {
    if (!Number.isFinite(row.last)) {
      continue;
    }
    equity += marketValue(row.qty, row.last);
  }
  return equity;
}

export function weightPct(part: number, whole: number): number {
  if (whole === 0) {
    return 0;
  }
  return (part / whole) * 100;
}

export type MarkedPositionInput = {
  id: string;
  instrument_id: string;
  symbol: string;
  sector: string | null;
  qty: number;
  avg_cost: number;
  realized_pnl: number;
  last: number;
  prev_close: number;
};

export const portfolioPositionViewSchema = z.object({
  id: uuidSchema,
  instrument_id: uuidSchema,
  symbol: z.string().min(1),
  sector: z.string().nullable(),
  qty: numericSchema,
  avg_cost: numericSchema,
  last: numericSchema,
  prev_close: numericSchema,
  market_value: numericSchema,
  unrealized_pnl: numericSchema,
  realized_pnl: numericSchema,
  day_pnl: numericSchema,
  weight_pct: numericSchema,
  unrealized_pnl_pct: numericSchema,
});

export type PortfolioPositionView = z.infer<typeof portfolioPositionViewSchema>;

export const portfolioAccountViewSchema = z.object({
  account_id: uuidSchema,
  cash: numericSchema,
  reserved_cash: numericSchema,
  buying_power: numericSchema,
  equity: numericSchema,
  day_pnl: numericSchema,
  currency: z.string().min(1),
});

export type PortfolioAccountView = z.infer<typeof portfolioAccountViewSchema>;

export const allocationSliceSchema = z.object({
  key: z.string().min(1),
  market_value: numericSchema,
  weight_pct: numericSchema,
});

export type AllocationSlice = z.infer<typeof allocationSliceSchema>;

export const portfolioResponseSchema = z.object({
  account: portfolioAccountViewSchema,
  positions: z.array(portfolioPositionViewSchema),
  allocations: z.object({
    by_position: z.array(allocationSliceSchema),
    by_sector: z.array(allocationSliceSchema),
  }),
  snapshots: z.array(portfolioSnapshotSchema),
});

export type PortfolioResponse = z.infer<typeof portfolioResponseSchema>;

export const analyticsPortfolioRequestSchema = z
  .object({
    op: z.literal("portfolio").optional(),
    range: equityCurveRangeSchema.optional(),
  })
  .strict();

export type AnalyticsPortfolioRequest = z.infer<typeof analyticsPortfolioRequestSchema>;

export const analyticsSnapshotRequestSchema = z
  .object({
    op: z.literal("snapshot").optional(),
    force: z.boolean().optional(),
    as_of_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict();

export type AnalyticsSnapshotRequest = z.infer<typeof analyticsSnapshotRequestSchema>;

export const analyticsSnapshotResponseSchema = z.object({
  written: z.number().int().nonnegative(),
  skipped: z.boolean(),
  as_of_date: z.string().nullable(),
});

export type AnalyticsSnapshotResponse = z.infer<typeof analyticsSnapshotResponseSchema>;

export function assemblePortfolio(input: {
  account: { id: string; cash: number; reserved_cash: number; currency: string };
  positions: readonly MarkedPositionInput[];
  snapshots?: PortfolioResponse["snapshots"];
}): PortfolioResponse {
  const open = input.positions.filter((row) => row.qty !== 0);
  const equity = markEquityFromPositions(
    input.account.cash,
    open.map((row) => ({ qty: row.qty, last: row.last })),
  );
  const buyingPower = buyingPowerFromCash(input.account.cash, input.account.reserved_cash);
  const positions: PortfolioPositionView[] = open.map((row) => {
    const mkt = marketValue(row.qty, row.last);
    return {
      id: row.id,
      instrument_id: row.instrument_id,
      symbol: row.symbol,
      sector: row.sector,
      qty: row.qty,
      avg_cost: row.avg_cost,
      last: row.last,
      prev_close: row.prev_close,
      market_value: mkt,
      unrealized_pnl: unrealizedPnl(row.qty, row.avg_cost, row.last),
      realized_pnl: row.realized_pnl,
      day_pnl: dayPnl(row.qty, row.last, row.prev_close),
      weight_pct: weightPct(mkt, equity),
      unrealized_pnl_pct: unrealizedPnlPct(row.qty, row.avg_cost, row.last),
    };
  });
  const dayTotal = positions.reduce((sum, row) => sum + row.day_pnl, 0);
  const byPosition = positions.map((row) => ({
    key: row.symbol,
    market_value: row.market_value,
    weight_pct: row.weight_pct,
  }));
  const sectorMap = new Map<string, number>();
  for (const row of positions) {
    const key = row.sector && row.sector.length > 0 ? row.sector : "Unknown";
    sectorMap.set(key, (sectorMap.get(key) ?? 0) + row.market_value);
  }
  const bySector = [...sectorMap.entries()].map(([key, value]) => ({
    key,
    market_value: value,
    weight_pct: weightPct(value, equity),
  }));
  return {
    account: {
      account_id: input.account.id,
      cash: input.account.cash,
      reserved_cash: input.account.reserved_cash,
      buying_power: buyingPower,
      equity,
      day_pnl: dayTotal,
      currency: input.account.currency,
    },
    positions,
    allocations: { by_position: byPosition, by_sector: bySector },
    snapshots: input.snapshots ?? [],
  };
}

export function revaluePortfolio(
  current: PortfolioResponse,
  quotes: Readonly<Record<string, { last: number; prev_close: number }>>,
): PortfolioResponse {
  return assemblePortfolio({
    account: {
      id: current.account.account_id,
      cash: current.account.cash,
      reserved_cash: current.account.reserved_cash,
      currency: current.account.currency,
    },
    positions: current.positions.map((row) => {
      const quote = quotes[row.instrument_id] ?? quotes[row.symbol];
      return {
        id: row.id,
        instrument_id: row.instrument_id,
        symbol: row.symbol,
        sector: row.sector,
        qty: row.qty,
        avg_cost: row.avg_cost,
        realized_pnl: row.realized_pnl,
        last: quote?.last ?? row.last,
        prev_close: quote?.prev_close ?? row.prev_close,
      };
    }),
    snapshots: current.snapshots,
  });
}

export function equityCurveWindowDays(range: EquityCurveRange): number {
  if (range === "1M") {
    return 31;
  }
  if (range === "3M") {
    return 92;
  }
  return 366;
}

export function filterEquityCurve(
  rows: readonly PortfolioResponse["snapshots"][number][],
  range: EquityCurveRange,
  now: Date,
): PortfolioResponse["snapshots"] {
  const cutoff = new Date(now.getTime() - equityCurveWindowDays(range) * 24 * 60 * 60 * 1000);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  return rows
    .filter((row) => row.as_of_date >= cutoffKey)
    .slice()
    .sort((a, b) => a.as_of_date.localeCompare(b.as_of_date));
}

export function dailySnapshotDate(input: {
  sessionDate: string | null;
  session: "OPEN" | "CLOSED";
  minutes: number;
  closeMinute: number | null;
  force?: boolean;
}): string | null {
  if (input.force && input.sessionDate) {
    return input.sessionDate;
  }
  if (!input.sessionDate || input.closeMinute == null) {
    return null;
  }
  if (input.session === "OPEN") {
    return null;
  }
  if (input.minutes < input.closeMinute) {
    return null;
  }
  return input.sessionDate;
}
