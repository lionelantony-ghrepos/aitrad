import type { OrderStatus } from "@meridian/schemas";
import { orderStatusSchema } from "@meridian/schemas";

/** Architecture §4 plus cancel-from-working/accepted/partially_filled (PBI-014). */
export const ORDER_STATUSES: readonly OrderStatus[] = orderStatusSchema.options;

const LEGAL: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ["validated", "rejected"],
  validated: ["accepted", "rejected"],
  accepted: ["working", "cancelled", "expired"],
  working: ["partially_filled", "filled", "cancelled", "expired"],
  partially_filled: ["partially_filled", "filled", "cancelled", "expired"],
  filled: [],
  cancelled: [],
  rejected: [],
  expired: [],
};

export const CANCEL_FROM: readonly OrderStatus[] = ["accepted", "working", "partially_filled"];

export function allowedTransitions(from: OrderStatus): readonly OrderStatus[] {
  return LEGAL[from];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return LEGAL[from].includes(to);
}

export function canCancel(status: OrderStatus): boolean {
  return canTransition(status, "cancelled");
}

export class OrderFsmError extends Error {
  readonly from: OrderStatus;
  readonly to: OrderStatus;

  constructor(from: OrderStatus, to: OrderStatus) {
    super(`FSM_ILLEGAL:${from}->${to}`);
    this.name = "OrderFsmError";
    this.from = from;
    this.to = to;
  }
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new OrderFsmError(from, to);
  }
}
