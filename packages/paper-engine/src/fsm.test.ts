import { describe, expect, it } from "vitest";
import { orderStatusSchema, type OrderStatus } from "@meridian/schemas";
import {
  CANCEL_FROM,
  ORDER_STATUSES,
  allowedTransitions,
  assertTransition,
  canCancel,
  canTransition,
  OrderFsmError,
} from "./fsm";

describe("TC-014-01 FSM transition matrix (AC-014-01)", () => {
  it("enumerates every from×to pair against the legal table", () => {
    const statuses = orderStatusSchema.options;
    expect(ORDER_STATUSES).toEqual(statuses);

    const expected = new Map<OrderStatus, ReadonlySet<OrderStatus>>([
      ["draft", new Set(["validated", "rejected"])],
      ["validated", new Set(["accepted", "rejected"])],
      ["accepted", new Set(["working", "cancelled", "expired"])],
      ["working", new Set(["partially_filled", "filled", "cancelled", "expired"])],
      ["partially_filled", new Set(["partially_filled", "filled", "cancelled", "expired"])],
      ["filled", new Set()],
      ["cancelled", new Set()],
      ["rejected", new Set()],
      ["expired", new Set()],
    ]);

    for (const from of statuses) {
      const allowed = new Set(allowedTransitions(from));
      expect(allowed).toEqual(expected.get(from));
      for (const to of statuses) {
        const legal = allowed.has(to);
        expect(canTransition(from, to)).toBe(legal);
        if (legal) {
          expect(() => assertTransition(from, to)).not.toThrow();
        } else {
          expect(() => assertTransition(from, to)).toThrow(OrderFsmError);
        }
      }
    }
  });

  it("allows cancel only from accepted, working, and partially_filled", () => {
    expect(CANCEL_FROM).toEqual(["accepted", "working", "partially_filled"]);
    for (const status of ORDER_STATUSES) {
      expect(canCancel(status)).toBe(CANCEL_FROM.includes(status));
    }
  });
});
