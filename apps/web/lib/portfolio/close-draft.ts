import { orderDraftSchema, type OrderDraft } from "@meridian/schemas";

export function closePositionDraft(input: { symbol: string; qty: number }): OrderDraft {
  if (input.qty === 0) {
    throw new Error("FLAT_POSITION");
  }
  return orderDraftSchema.parse({
    symbol: input.symbol,
    side: input.qty > 0 ? "sell" : "buy",
    qty: Math.abs(input.qty),
    order_type: "market",
    tif: "DAY",
  });
}
