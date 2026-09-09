import { describe, expect, it } from "vitest";
import {
  SerializedCashBook,
  availableBuyingPower,
  releaseBuyingPower,
  reserveAmountForSide,
  tryReserveBuyingPower,
} from "./buying-power";

describe("buying power reserve", () => {
  it("reserves when cash remains after existing holds", () => {
    const start = { cashBalance: 1000, reservedCash: 200 };
    expect(availableBuyingPower(start)).toBe(800);
    const ok = tryReserveBuyingPower(start, 800);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.ledger.reservedCash).toBe(1000);
    }
    const fail = tryReserveBuyingPower(start, 801);
    expect(fail.ok).toBe(false);
    if (!fail.ok) {
      expect(fail.reasonCode).toBe("RISK_BUYING_POWER");
      expect(fail.ledger).toEqual(start);
    }
  });

  it("does not reserve cash on sells", () => {
    expect(reserveAmountForSide({ side: "sell", orderNotional: 500, estimatedFees: 1 })).toBe(0);
    expect(reserveAmountForSide({ side: "buy", orderNotional: 500, estimatedFees: 2 })).toBe(502);
  });

  it("releases reserved cash without going negative", () => {
    expect(releaseBuyingPower({ cashBalance: 10, reservedCash: 4 }, 10)).toEqual({
      cashBalance: 10,
      reservedCash: 0,
    });
  });
});

describe("TC-014-02 concurrent reserve (AC-014-02)", () => {
  it("serializes two overlapping reserves so only one can spend the same cash", async () => {
    const book = new SerializedCashBook({ cashBalance: 1000, reservedCash: 0 });
    const [first, second] = await Promise.all([book.reserve(700), book.reserve(700)]);
    const okCount = [first, second].filter((row) => row.ok).length;
    expect(okCount).toBe(1);
    expect([first, second].find((row) => !row.ok)?.reasonCode).toBe("RISK_BUYING_POWER");
    expect(book.snapshot().reservedCash).toBe(700);
  });
});
