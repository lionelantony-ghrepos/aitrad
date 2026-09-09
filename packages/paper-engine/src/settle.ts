import type { OrderSide } from "@meridian/schemas";
import { releaseBuyingPower, type CashLedger } from "./buying-power";

export type ReservedOrder = {
  side: OrderSide;
  qty: number;
  filled_qty: number;
  reserved_amount: number;
};

export function reservedReleaseForFill(order: ReservedOrder, fillQty: number): number {
  if (order.side !== "buy") {
    return 0;
  }
  const remaining = Math.max(0, order.qty - order.filled_qty);
  if (remaining <= 0 || fillQty <= 0) {
    return 0;
  }
  if (fillQty >= remaining) {
    return order.reserved_amount;
  }
  return (order.reserved_amount * fillQty) / remaining;
}

export function cashDeltaForFill(side: OrderSide, qty: number, price: number): number {
  const notional = qty * price;
  return side === "buy" ? -notional : notional;
}

export function applyFillToLedger(
  ledger: CashLedger,
  order: ReservedOrder,
  fill: { qty: number; price: number; side: OrderSide },
): { ledger: CashLedger; reservedReleased: number; reservedRemaining: number } {
  const reservedReleased = reservedReleaseForFill(order, fill.qty);
  const released = releaseBuyingPower(ledger, reservedReleased);
  return {
    ledger: {
      cashBalance: released.cashBalance + cashDeltaForFill(fill.side, fill.qty, fill.price),
      reservedCash: released.reservedCash,
    },
    reservedReleased,
    reservedRemaining: Math.max(0, order.reserved_amount - reservedReleased),
  };
}
