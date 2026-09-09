import { applyTicks, type CycleOrder } from "@meridian/paper-engine";
import type { MatchTick, OrderRecord } from "@meridian/schemas";
import { getStubState, stubListOrders, stubReplaceOrder } from "@/lib/auth/stub-store";

const CFG = { slippage_bps: 0, liquidity_cap: 10_000 };

function toCycle(order: OrderRecord): CycleOrder {
  return {
    id: order.id,
    side: order.side,
    qty: order.qty,
    filled_qty: order.filled_qty,
    order_type: order.order_type,
    limit_price: order.limit_price,
    stop_price: order.stop_price,
    stop_triggered: order.stop_triggered,
    tif: order.tif,
    created_at: order.created_at,
    status: order.status,
    symbol: order.symbol,
    reserved_amount: order.reserved_amount ?? 0,
    group_id: order.group_id ?? null,
    leg_role: order.leg_role ?? null,
    group_activated: order.group_activated,
    trail_type: order.trail_type ?? null,
    trail_value: order.trail_value ?? null,
    high_water_mark: order.high_water_mark ?? null,
  };
}

export function stubApplyTicks(userId: string, ticks: readonly MatchTick[]): OrderRecord[] {
  const account = getStubState().accounts.get(userId);
  const existing = stubListOrders(userId);
  if (!account || existing.length === 0 || ticks.length === 0) {
    return existing;
  }
  const result = applyTicks(
    {
      orders: existing.map(toCycle),
      positions: [],
      ledger: {
        cashBalance: account.cash_balance,
        reservedCash: account.reserved_cash ?? 0,
      },
      lastBySymbol: {},
    },
    ticks,
    CFG,
  );
  account.cash_balance = result.state.ledger.cashBalance;
  account.reserved_cash = result.state.ledger.reservedCash;
  const now = new Date().toISOString();
  for (const order of result.state.orders) {
    const prior = existing.find((row) => row.id === order.id);
    if (!prior) {
      continue;
    }
    stubReplaceOrder({
      ...prior,
      status: order.status,
      filled_qty: order.filled_qty,
      reserved_amount: order.reserved_amount,
      stop_triggered: order.stop_triggered,
      stop_price: order.stop_price ?? prior.stop_price,
      high_water_mark: order.high_water_mark ?? prior.high_water_mark,
      group_activated: order.group_activated ?? prior.group_activated,
      updated_at: now,
    });
  }
  return stubListOrders(userId);
}
