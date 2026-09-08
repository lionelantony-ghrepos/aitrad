/** Convert notional dollars to share qty at a live last price. */
export function sharesFromNotional(notional: number, lastPrice: number): number {
  if (!Number.isFinite(notional) || !Number.isFinite(lastPrice) || lastPrice <= 0) {
    return 0;
  }
  return notional / lastPrice;
}

/** Convert share qty to notional at a live last price. */
export function notionalFromShares(shares: number, lastPrice: number): number {
  if (!Number.isFinite(shares) || !Number.isFinite(lastPrice) || lastPrice <= 0) {
    return 0;
  }
  return shares * lastPrice;
}

export function referencePrice(input: {
  orderType: string;
  lastPrice: number;
  limitPrice: number | null | undefined;
}): number {
  if (
    (input.orderType === "limit" || input.orderType === "stop_limit") &&
    input.limitPrice != null &&
    Number.isFinite(input.limitPrice)
  ) {
    return input.limitPrice;
  }
  return input.lastPrice;
}
