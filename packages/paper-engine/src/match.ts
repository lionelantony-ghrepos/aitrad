import {
  matchFillSchema,
  matchTickSchema,
  workingOrderMatchSchema,
  type ExecConfig,
  type MatchFill,
  type MatchTick,
  type WorkingOrderMatch,
} from "@meridian/schemas";
import { resolveExecConfig, type ExecConfigResolver } from "./exec-config";

export type MatchResult = {
  fills: MatchFill[];
  triggeredOrderIds: string[];
};

function marketPrice(last: number, side: "buy" | "sell", slippageBps: number): number {
  const slip = last * (slippageBps / 10_000);
  return side === "buy" ? last + slip : last - slip;
}

function applyTickSize(price: number, tickSize: number | undefined): number {
  if (!tickSize || !Number.isFinite(tickSize) || tickSize <= 0) {
    return price;
  }
  return Math.round(price / tickSize) * tickSize;
}

function isStopTriggered(order: WorkingOrderMatch, last: number): boolean {
  const stop = order.stop_price;
  if (stop == null || !Number.isFinite(stop)) {
    return false;
  }
  if (order.side === "buy") {
    return last >= stop;
  }
  return last <= stop;
}

function isLimitMarketable(order: WorkingOrderMatch, last: number): boolean {
  const limit = order.limit_price;
  if (limit == null || !Number.isFinite(limit)) {
    return false;
  }
  if (order.side === "buy") {
    return last <= limit;
  }
  return last >= limit;
}

function limitFillPrice(order: WorkingOrderMatch, last: number): number {
  const limit = order.limit_price;
  if (limit == null || !Number.isFinite(limit)) {
    return last;
  }
  return order.side === "buy" ? Math.min(last, limit) : Math.max(last, limit);
}

function remainingQty(order: WorkingOrderMatch): number {
  return Math.max(0, order.qty - order.filled_qty);
}

function compareOrders(a: WorkingOrderMatch, b: WorkingOrderMatch): number {
  const at = a.created_at ?? "";
  const bt = b.created_at ?? "";
  if (at !== bt) {
    return at < bt ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function capFor(config: ExecConfig): number {
  if (config.liquidity_cap == null) {
    return Number.POSITIVE_INFINITY;
  }
  if (!Number.isFinite(config.liquidity_cap) || config.liquidity_cap <= 0) {
    return 0;
  }
  return config.liquidity_cap;
}

/**
 * Deterministic paper match for one tick. Policy values arrive in execConfig
 * (from evaluateDomain('execution_sim') / DT-EXEC-01).
 */
export function matchOrders(
  tick: MatchTick,
  workingOrders: readonly WorkingOrderMatch[],
  execConfig: ExecConfigResolver,
): MatchResult {
  const parsedTick = matchTickSchema.parse(tick);
  const last = parsedTick.last;
  const fills: MatchFill[] = [];
  const triggeredOrderIds: string[] = [];

  const orders = workingOrders.map((row) => workingOrderMatchSchema.parse(row)).sort(compareOrders);

  for (const order of orders) {
    const leftover = remainingQty(order);
    if (leftover <= 0) {
      continue;
    }

    const config = resolveExecConfig(execConfig, order.id);
    let triggered = Boolean(order.stop_triggered);
    let effectiveType = order.order_type;

    if (order.order_type === "stop" || order.order_type === "stop_limit") {
      if (!triggered && isStopTriggered(order, last)) {
        triggered = true;
        triggeredOrderIds.push(order.id);
      }
      if (!triggered) {
        continue;
      }
      effectiveType = order.order_type === "stop" ? "market" : "limit";
    }

    let price: number | null = null;
    if (effectiveType === "market") {
      price = marketPrice(last, order.side, config.slippage_bps);
    } else if (effectiveType === "limit") {
      if (!isLimitMarketable(order, last)) {
        continue;
      }
      price = limitFillPrice(order, last);
    } else {
      continue;
    }

    const qty = Math.min(leftover, capFor(config));
    if (qty <= 0 || price <= 0 || !Number.isFinite(price) || !Number.isFinite(qty)) {
      continue;
    }

    fills.push(
      matchFillSchema.parse({
        order_id: order.id,
        side: order.side,
        qty,
        price: applyTickSize(price, config.tick_size),
      }),
    );
  }

  return { fills, triggeredOrderIds };
}

export function match(
  tick: MatchTick,
  workingOrders: readonly WorkingOrderMatch[],
  execConfig: ExecConfigResolver,
): MatchFill[] {
  return matchOrders(tick, workingOrders, execConfig).fills;
}
