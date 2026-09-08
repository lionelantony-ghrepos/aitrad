/** Cash ledger arithmetic. Caps live in DT-RISK-01, not here. */

export type CashLedger = {
  cashBalance: number;
  reservedCash: number;
};

export function availableBuyingPower(ledger: CashLedger): number {
  return ledger.cashBalance - ledger.reservedCash;
}

export function tryReserveBuyingPower(
  ledger: CashLedger,
  amount: number,
):
  | { ok: true; ledger: CashLedger }
  | { ok: false; ledger: CashLedger; reasonCode: "RISK_BUYING_POWER" } {
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, ledger, reasonCode: "RISK_BUYING_POWER" };
  }
  if (amount === 0) {
    return { ok: true, ledger };
  }
  if (availableBuyingPower(ledger) < amount) {
    return { ok: false, ledger, reasonCode: "RISK_BUYING_POWER" };
  }
  return {
    ok: true,
    ledger: { cashBalance: ledger.cashBalance, reservedCash: ledger.reservedCash + amount },
  };
}

export function releaseBuyingPower(ledger: CashLedger, amount: number): CashLedger {
  const next = Math.max(0, ledger.reservedCash - Math.max(0, amount));
  return { cashBalance: ledger.cashBalance, reservedCash: next };
}

export function reserveAmountForSide(input: {
  side: "buy" | "sell";
  orderNotional: number;
  estimatedFees: number;
}): number {
  if (input.side !== "buy") {
    return 0;
  }
  return Math.max(0, input.orderNotional + input.estimatedFees);
}

/** Serializes reserve attempts the way `SELECT … FOR UPDATE` does in SQL. */
export class SerializedCashBook {
  private chain: Promise<void> = Promise.resolve();
  private ledger: CashLedger;

  constructor(ledger: CashLedger) {
    this.ledger = { ...ledger };
  }

  snapshot(): CashLedger {
    return { ...this.ledger };
  }

  reserve(amount: number): Promise<{ ok: boolean; reasonCode?: "RISK_BUYING_POWER" }> {
    const run = this.chain.then(() => {
      const result = tryReserveBuyingPower(this.ledger, amount);
      this.ledger = result.ledger;
      return result.ok
        ? { ok: true as const }
        : { ok: false as const, reasonCode: result.reasonCode };
    });
    this.chain = run.then(() => undefined);
    return run;
  }
}
