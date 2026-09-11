import type { OrderDraft, OrderLegRole, OrderStatus, WorkingOrderMatch } from "@meridian/schemas";
import { orderDraftSchema } from "@meridian/schemas";

export type ExpandedGroupLeg = {
  draft: OrderDraft;
  leg_role: OrderLegRole | null;
  group_activated: boolean;
  trail_type: OrderDraft["trail_type"];
  trail_value: OrderDraft["trail_value"];
};

export function oppositeSide(side: OrderDraft["side"]): OrderDraft["side"] {
  return side === "buy" ? "sell" : "buy";
}

export function isChildProtectionLeg(role: OrderLegRole | null | undefined): boolean {
  return role === "take_profit" || role === "stop_loss";
}

export function isOcoLeg(role: OrderLegRole | null | undefined): boolean {
  return role === "oco_a" || role === "oco_b";
}

export function shouldPromoteAccepted(order: {
  status: OrderStatus;
  leg_role?: OrderLegRole | null;
  group_activated?: boolean;
}): boolean {
  if (order.status !== "accepted") {
    return false;
  }
  if (isChildProtectionLeg(order.leg_role)) {
    return Boolean(order.group_activated);
  }
  return true;
}

export function isStopPriority(
  order: Pick<WorkingOrderMatch, "order_type" | "leg_role" | "trail_type">,
): boolean {
  if (order.order_type === "stop" || order.order_type === "stop_limit") {
    return true;
  }
  if (order.leg_role === "stop_loss") {
    return true;
  }
  return order.trail_type === "percent" || order.trail_type === "amount";
}

export function expandOrderGroup(draft: OrderDraft): ExpandedGroupLeg[] {
  const parsed = orderDraftSchema.parse(draft);
  if (parsed.group_type === "bracket") {
    const exitSide = oppositeSide(parsed.side);
    const entry: ExpandedGroupLeg = {
      draft: {
        ...parsed,
        group_type: "bracket",
      },
      leg_role: "entry",
      group_activated: true,
      trail_type: parsed.trail_type ?? null,
      trail_value: parsed.trail_value ?? null,
    };
    const takeProfit: ExpandedGroupLeg = {
      draft: {
        ...parsed,
        side: exitSide,
        order_type: "limit",
        limit_price: parsed.tp_price ?? null,
        stop_price: null,
        trail_type: null,
        trail_value: null,
      },
      leg_role: "take_profit",
      group_activated: false,
      trail_type: null,
      trail_value: null,
    };
    const stopLoss: ExpandedGroupLeg = {
      draft: {
        ...parsed,
        side: exitSide,
        order_type: "stop",
        limit_price: null,
        stop_price: parsed.sl_price ?? null,
        trail_type: null,
        trail_value: null,
      },
      leg_role: "stop_loss",
      group_activated: false,
      trail_type: null,
      trail_value: null,
    };
    return [entry, takeProfit, stopLoss];
  }

  if (parsed.group_type === "oco") {
    const limitLeg: ExpandedGroupLeg = {
      draft: {
        ...parsed,
        order_type: "limit",
        limit_price: parsed.tp_price ?? parsed.limit_price ?? null,
        stop_price: null,
        trail_type: null,
        trail_value: null,
      },
      leg_role: "oco_a",
      group_activated: true,
      trail_type: null,
      trail_value: null,
    };
    const stopLeg: ExpandedGroupLeg = {
      draft: {
        ...parsed,
        order_type: "stop",
        limit_price: null,
        stop_price: parsed.sl_price ?? parsed.stop_price ?? null,
        trail_type: parsed.trail_type ?? null,
        trail_value: parsed.trail_value ?? null,
      },
      leg_role: "oco_b",
      group_activated: true,
      trail_type: parsed.trail_type ?? null,
      trail_value: parsed.trail_value ?? null,
    };
    return [limitLeg, stopLeg];
  }

  return [
    {
      draft: parsed,
      leg_role: null,
      group_activated: true,
      trail_type: parsed.trail_type ?? null,
      trail_value: parsed.trail_value ?? null,
    },
  ];
}

export type GroupOrderRef = {
  id: string;
  group_id?: string | null;
  leg_role?: OrderLegRole | null;
  status: OrderStatus;
};

export type GroupSideEffect = {
  activateIds: string[];
  cancelIds: string[];
};

function siblingRole(role: OrderLegRole | null | undefined): OrderLegRole | null {
  if (role === "take_profit") {
    return "stop_loss";
  }
  if (role === "stop_loss") {
    return "take_profit";
  }
  if (role === "oco_a") {
    return "oco_b";
  }
  if (role === "oco_b") {
    return "oco_a";
  }
  return null;
}

const CANCELABLE: ReadonlySet<OrderStatus> = new Set(["accepted", "working", "partially_filled"]);

export function groupActionsAfterFills(
  orders: readonly GroupOrderRef[],
  filledIds: readonly string[],
): GroupSideEffect {
  const filled = new Set(filledIds);
  const activate = new Set<string>();
  const cancel = new Set<string>();

  for (const id of filledIds) {
    const order = orders.find((row) => row.id === id);
    if (!order?.group_id) {
      continue;
    }
    const mates = orders.filter((row) => row.group_id === order.group_id && row.id !== order.id);
    if (order.leg_role === "entry") {
      for (const mate of mates) {
        if (isChildProtectionLeg(mate.leg_role) && CANCELABLE.has(mate.status)) {
          activate.add(mate.id);
        }
      }
      continue;
    }
    const targetRole = siblingRole(order.leg_role);
    if (!targetRole) {
      continue;
    }
    for (const mate of mates) {
      if (mate.leg_role === targetRole && CANCELABLE.has(mate.status) && !filled.has(mate.id)) {
        cancel.add(mate.id);
      }
    }
  }

  return { activateIds: [...activate], cancelIds: [...cancel] };
}

export function resolveSameTickGroupFills<T extends { order_id: string }>(
  fills: readonly T[],
  orders: readonly WorkingOrderMatch[],
): T[] {
  if (fills.length <= 1) {
    return [...fills];
  }
  const byId = new Map(orders.map((row) => [row.id, row]));
  const grouped = new Map<string, T[]>();
  const ungrouped: T[] = [];
  for (const fill of fills) {
    const order = byId.get(fill.order_id);
    const key = order?.group_id;
    if (!key) {
      ungrouped.push(fill);
      continue;
    }
    const list = grouped.get(key) ?? [];
    list.push(fill);
    grouped.set(key, list);
  }

  const winners: T[] = [...ungrouped];
  for (const list of grouped.values()) {
    if (list.length === 1) {
      winners.push(list[0] as T);
      continue;
    }
    const ranked = [...list].sort((a, b) => {
      const oa = byId.get(a.order_id);
      const ob = byId.get(b.order_id);
      const sa = oa && isStopPriority(oa) ? 0 : 1;
      const sb = ob && isStopPriority(ob) ? 0 : 1;
      if (sa !== sb) {
        return sa - sb;
      }
      return a.order_id < b.order_id ? -1 : 1;
    });
    const winner = ranked[0];
    if (winner) {
      winners.push(winner);
    }
  }
  return winners;
}
