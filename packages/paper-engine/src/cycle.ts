import type {
  ExecConfig,
  MatchFill,
  MatchTick,
  OrderStatus,
  WorkingOrderMatch,
} from "@meridian/schemas";
import { assertTransition } from "./fsm";
import { matchOrders } from "./match";
import { applyFillToPosition, emptyPosition, markEquity, type PositionBook } from "./positions";
import { applyFillToLedger, type ReservedOrder } from "./settle";
import type { CashLedger } from "./buying-power";
import type { ExecConfigResolver } from "./exec-config";

export type CycleOrder = WorkingOrderMatch &
  ReservedOrder & {
    status: OrderStatus;
    symbol: string;
    reserved_amount: number;
  };

export type CyclePosition = PositionBook & { symbol: string };

export type PaperCycleState = {
  orders: CycleOrder[];
  positions: CyclePosition[];
  ledger: CashLedger;
  lastBySymbol: Record<string, number>;
};

export type PaperCycleEvent =
  | { kind: "promoted"; orderId: string }
  | { kind: "fill"; fill: MatchFill; status: OrderStatus }
  | { kind: "triggered"; orderId: string };

export type PaperCycleResult = {
  state: PaperCycleState;
  events: PaperCycleEvent[];
  fills: MatchFill[];
};

function nextStatus(from: OrderStatus, filledQty: number, qty: number): OrderStatus {
  const to: OrderStatus = filledQty >= qty ? "filled" : "partially_filled";
  assertTransition(from, to);
  return to;
}

function promoteAccepted(orders: CycleOrder[], events: PaperCycleEvent[]): CycleOrder[] {
  return orders.map((order) => {
    if (order.status !== "accepted") {
      return order;
    }
    assertTransition("accepted", "working");
    events.push({ kind: "promoted", orderId: order.id });
    return { ...order, status: "working" };
  });
}

function upsertPosition(
  positions: CyclePosition[],
  symbol: string,
  next: PositionBook,
): CyclePosition[] {
  const idx = positions.findIndex((row) => row.symbol === symbol);
  const row: CyclePosition = { symbol, ...next };
  if (idx === -1) {
    return [...positions, row];
  }
  const copy = positions.slice();
  copy[idx] = row;
  return copy;
}

export function applyTickToBook(
  state: PaperCycleState,
  tick: MatchTick,
  execConfig: ExecConfigResolver,
): PaperCycleResult {
  const events: PaperCycleEvent[] = [];
  const lastBySymbol = { ...state.lastBySymbol };
  if (tick.symbol) {
    lastBySymbol[tick.symbol] = tick.last;
  }

  let orders = promoteAccepted(state.orders, events);
  const symbol = tick.symbol;
  const working = orders.filter(
    (order) =>
      (order.status === "working" || order.status === "partially_filled") &&
      (symbol == null || order.symbol === symbol),
  );

  const matched = matchOrders(tick, working, execConfig);
  for (const id of matched.triggeredOrderIds) {
    events.push({ kind: "triggered", orderId: id });
    orders = orders.map((order) => (order.id === id ? { ...order, stop_triggered: true } : order));
  }

  let positions = state.positions.map((row) => ({ ...row }));
  let ledger = { ...state.ledger };
  const fills: MatchFill[] = [];

  for (const fill of matched.fills) {
    const current = orders.find((order) => order.id === fill.order_id);
    if (!current) {
      continue;
    }
    const filledQty = current.filled_qty + fill.qty;
    const status = nextStatus(current.status, filledQty, current.qty);
    const settled = applyFillToLedger(ledger, current, fill);
    ledger = settled.ledger;
    const pos = positions.find((row) => row.symbol === current.symbol) ?? {
      symbol: current.symbol,
      ...emptyPosition(),
    };
    positions = upsertPosition(
      positions,
      current.symbol,
      applyFillToPosition(pos, { side: fill.side, qty: fill.qty, price: fill.price }),
    );
    orders = orders.map((order) =>
      order.id === fill.order_id
        ? {
            ...order,
            filled_qty: filledQty,
            status,
            reserved_amount: settled.reservedRemaining,
            stop_triggered: order.stop_triggered || matched.triggeredOrderIds.includes(order.id),
          }
        : order,
    );
    fills.push(fill);
    events.push({ kind: "fill", fill, status });
  }

  return {
    state: { orders, positions, ledger, lastBySymbol },
    events,
    fills,
  };
}

export function applyTicks(
  state: PaperCycleState,
  ticks: readonly MatchTick[],
  execConfig: ExecConfig | ((orderId: string) => ExecConfig),
): PaperCycleResult {
  let current = state;
  const events: PaperCycleEvent[] = [];
  const fills: MatchFill[] = [];
  for (const tick of ticks) {
    const step = applyTickToBook(current, tick, execConfig);
    current = step.state;
    events.push(...step.events);
    fills.push(...step.fills);
  }
  return { state: current, events, fills };
}

export function bookEquity(state: PaperCycleState): number {
  return markEquity(
    state.ledger.cashBalance,
    state.positions.map((row) => ({ qty: row.qty, symbol: row.symbol })),
    state.lastBySymbol,
  );
}
