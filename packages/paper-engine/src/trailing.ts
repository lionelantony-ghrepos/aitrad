import type { TrailType, WorkingOrderMatch } from "@meridian/schemas";

export type TrailingFields = {
  side: "buy" | "sell";
  trail_type?: TrailType | null;
  trail_value?: number | null;
  high_water_mark?: number | null;
  stop_price?: number | null;
};

export type TrailingRatchet = {
  high_water_mark: number;
  stop_price: number;
  triggered: boolean;
};

function trailStopFromMark(input: {
  side: "buy" | "sell";
  mark: number;
  trailType: TrailType;
  trailValue: number;
}): number {
  if (input.trailType === "percent") {
    const factor = input.trailValue / 100;
    return input.side === "sell" ? input.mark * (1 - factor) : input.mark * (1 + factor);
  }
  return input.side === "sell" ? input.mark - input.trailValue : input.mark + input.trailValue;
}

export function isTrailingStop(
  order: Pick<WorkingOrderMatch, "trail_type" | "trail_value">,
): boolean {
  return order.trail_type === "percent" || order.trail_type === "amount"
    ? order.trail_value != null && Number.isFinite(order.trail_value)
    : false;
}

/**
 * Server-side trail: the mark only moves in the favorable direction (never loosens).
 * Sell: mark is a high-water max; buy: mark is a low-water min stored in high_water_mark.
 */
export function ratchetTrailingStop(order: TrailingFields, last: number): TrailingRatchet | null {
  if (order.trail_type !== "percent" && order.trail_type !== "amount") {
    return null;
  }
  const trailValue = order.trail_value;
  if (trailValue == null || !Number.isFinite(trailValue) || !Number.isFinite(last)) {
    return null;
  }

  const prior = order.high_water_mark;
  const mark =
    order.side === "sell"
      ? Math.max(prior != null && Number.isFinite(prior) ? prior : last, last)
      : Math.min(prior != null && Number.isFinite(prior) ? prior : last, last);

  const stop = trailStopFromMark({
    side: order.side,
    mark,
    trailType: order.trail_type,
    trailValue,
  });

  const triggered = order.side === "sell" ? last <= stop : last >= stop;
  return { high_water_mark: mark, stop_price: stop, triggered };
}

export function initialTrailMark(last: number): number {
  return last;
}

export function seedTrailingOnCreate(
  order: TrailingFields,
  last: number,
): { high_water_mark: number | null; stop_price: number | null } {
  const ratchet = ratchetTrailingStop({ ...order, high_water_mark: last }, last);
  if (!ratchet) {
    return { high_water_mark: null, stop_price: order.stop_price ?? null };
  }
  return { high_water_mark: ratchet.high_water_mark, stop_price: ratchet.stop_price };
}
