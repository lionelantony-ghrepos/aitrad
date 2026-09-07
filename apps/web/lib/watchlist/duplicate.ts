import { duplicateWatchlistItemMessage } from "@meridian/schemas";

export function findDuplicateInstrument(
  items: readonly { instrument_id: string }[],
  instrumentId: string,
): boolean {
  return items.some((item) => item.instrument_id === instrumentId);
}

export function duplicateItemResult(symbol: string): { ok: false; message: string } {
  return { ok: false, message: duplicateWatchlistItemMessage(symbol) };
}
