import { describe, expect, it } from "vitest";
import { ratchetTrailingStop } from "./trailing";

describe("TC-016-02 trailing ratchet never loosens and triggers on pullback (AC-016-02)", () => {
  it("sell trail: HWM only rises; pullback to trail distance triggers", () => {
    const trail = { side: "sell" as const, trail_type: "percent" as const, trail_value: 10 };
    const t1 = ratchetTrailingStop({ ...trail, high_water_mark: null, stop_price: null }, 100);
    expect(t1?.high_water_mark).toBe(100);
    expect(t1?.stop_price).toBeCloseTo(90, 8);
    expect(t1?.triggered).toBe(false);

    const t2 = ratchetTrailingStop(
      { ...trail, high_water_mark: t1?.high_water_mark, stop_price: t1?.stop_price },
      110,
    );
    expect(t2?.high_water_mark).toBe(110);
    expect(t2?.stop_price).toBeCloseTo(99, 8);
    expect(t2?.triggered).toBe(false);

    const loosen = ratchetTrailingStop(
      { ...trail, high_water_mark: t2?.high_water_mark, stop_price: t2?.stop_price },
      105,
    );
    expect(loosen?.high_water_mark).toBe(110);
    expect(loosen?.stop_price).toBeCloseTo(99, 8);
    expect(loosen?.triggered).toBe(false);

    const pullback = ratchetTrailingStop(
      { ...trail, high_water_mark: loosen?.high_water_mark, stop_price: loosen?.stop_price },
      99,
    );
    expect(pullback?.high_water_mark).toBe(110);
    expect(pullback?.triggered).toBe(true);
  });

  it("dollar trail ratchets the mark and does not loosen on a dip", () => {
    const trail = { side: "sell" as const, trail_type: "amount" as const, trail_value: 2 };
    const up = ratchetTrailingStop({ ...trail, high_water_mark: 10, stop_price: 8 }, 12);
    expect(up?.high_water_mark).toBe(12);
    expect(up?.stop_price).toBe(10);
    const dip = ratchetTrailingStop({ ...trail, high_water_mark: 12, stop_price: 10 }, 11);
    expect(dip?.high_water_mark).toBe(12);
    expect(dip?.stop_price).toBe(10);
  });
});
