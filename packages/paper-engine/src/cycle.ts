import type {
  ExecConfig,
  MatchFill,
  MatchTick,
  OrderLegRole,
  OrderStatus,
  WorkingOrderMatch,
} from "@meridian/schemas";
import type { CashLedger } from "./buying-power";
import { releaseBuyingPower } from "./buying-power";
import { assertTransition, canCancel } from "./fsm";
import { groupActionsAfterFills, shouldPromoteAccepted } from "./groups";
import { matchOrders } from "./match";
import { applyFillToPosition, emptyPosition, markEquity, type PositionBook } from "./positions";
import { applyFillToLedger, type ReservedOrder } from "./settle";
import type { ExecConfigResolver } from "./exec-config";

export type CycleOrder = WorkingOrderMatch &
  ReservedOrder & {
    status: OrderStatus;
    symbol: string;
    reserved_amount: number;
    group_id?: string | null;
    leg_role?: OrderLegRole | null;
    group_activated?: boolean;
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
  | { kind: "triggered"; orderId: string }
  | { kind: "activated"; orderId: string }
  | { kind: "cancelled"; orderId: string }
  | { kind: "trailing"; orderId: string };

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
    if (!shouldPromoteAccepted(order)) {
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
  for (const update of matched.trailingUpdates) {
    events.push({ kind: "trailing", orderId: update.orderId });
    orders = orders.map((order) =>
      order.id === update.orderId
        ? {
            ...order,
            high_water_mark: update.high_water_mark,
            stop_price: update.stop_price,
          }
        : order,
    );
  }
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

  const effects = groupActionsAfterFills(
    orders,
    fills
      .filter((row) => {
        const current = orders.find((order) => order.id === row.order_id);
        return current?.status === "filled";
      })
      .map((row) => row.order_id),
  );
  for (const id of effects.activateIds) {
    orders = orders.map((order) => {
      if (order.id !== id) {
        return order;
      }
      const activated = { ...order, group_activated: true };
      if (activated.status === "accepted" && shouldPromoteAccepted(activated)) {
        assertTransition("accepted", "working");
        events.push({ kind: "activated", orderId: id });
        events.push({ kind: "promoted", orderId: id });
        return { ...activated, status: "working" as const };
      }
      events.push({ kind: "activated", orderId: id });
      return activated;
    });
  }
  for (const id of effects.cancelIds) {
    const current = orders.find((order) => order.id === id);
    if (!current || !canCancel(current.status)) {
      continue;
    }
    if (current.reserved_amount > 0) {
      ledger = releaseBuyingPower(ledger, current.reserved_amount);
    }
    assertTransition(current.status, "cancelled");
    events.push({ kind: "cancelled", orderId: id });
    orders = orders.map((order) =>
      order.id === id ? { ...order, status: "cancelled" as const, reserved_amount: 0 } : order,
    );
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
