import { describe, expect, it } from "vitest";
import { baselineTable, evaluate } from "@meridian/rules-engine";
import type { ExecConfig, WorkingOrderMatch } from "@meridian/schemas";
import { liquidityCapShares, parseExecConfig } from "./exec-config";
import { match, matchOrders } from "./match";

const CFG: ExecConfig = { slippage_bps: 10, liquidity_cap: 10_000, tick_size: 0.01 };

function order(
  partial: Partial<WorkingOrderMatch> & Pick<WorkingOrderMatch, "id" | "order_type" | "side">,
): WorkingOrderMatch {
  return {
    qty: 100,
    filled_qty: 0,
    ...partial,
  };
}

function tick(last: number) {
  return { last, symbol: "AAPL" };
}

describe("TC-015-01 unit suite each order type × price paths (AC-015-01..03)", () => {
  it("fills a market buy at last plus slippage from execConfig (AC-015-01)", () => {
    const fills = match(
      tick(100),
      [order({ id: "m-buy", side: "buy", order_type: "market" })],
      CFG,
    );
    expect(fills).toHaveLength(1);
    expect(fills[0]?.price).toBeCloseTo(100.1, 8);
    expect(fills[0]?.qty).toBe(100);
  });

  it("fills a market sell at last minus slippage from execConfig (AC-015-01)", () => {
    const fills = match(
      tick(100),
      [order({ id: "m-sell", side: "sell", order_type: "market" })],
      CFG,
    );
    expect(fills[0]?.price).toBeCloseTo(99.9, 8);
  });

  it("uses DT-EXEC-01 outcome as execConfig without embedding table values in match()", () => {
    const high = evaluate(
      baselineTable("DT-EXEC-01"),
      { avg_volume_band: "high", order_notional: 1 },
      new Date(),
    );
    const cfg = parseExecConfig(high.outcome);
    expect(cfg).not.toBeNull();
    if (!cfg) {
      return;
    }
    const fills = match(tick(50), [order({ id: "dt", side: "buy", order_type: "market" })], {
      ...cfg,
      liquidity_cap: 1_000,
    });
    expect(fills[0]?.price).toBeGreaterThan(50);
  });

  it("does not fill a limit buy below the market (AC-015-02)", () => {
    const fills = match(
      tick(100),
      [order({ id: "l-buy", side: "buy", order_type: "limit", limit_price: 95 })],
      CFG,
    );
    expect(fills).toEqual([]);
  });

  it("fills a limit buy when last crosses the limit, never through the limit (AC-015-02)", () => {
    const fills = match(
      tick(94),
      [order({ id: "l-buy-x", side: "buy", order_type: "limit", limit_price: 95 })],
      CFG,
    );
    expect(fills).toHaveLength(1);
    expect(fills[0]?.price).toBe(94);
    expect(fills[0]?.price).toBeLessThanOrEqual(95);
  });

  it("gives sell-limit price improvement and never fills through the limit (AC-015-02)", () => {
    const fills = match(
      tick(106),
      [order({ id: "l-sell", side: "sell", order_type: "limit", limit_price: 105 })],
      CFG,
    );
    expect(fills[0]?.price).toBe(106);
    const blocked = match(
      tick(104),
      [order({ id: "l-sell-miss", side: "sell", order_type: "limit", limit_price: 105 })],
      CFG,
    );
    expect(blocked).toEqual([]);
  });

  it("does not trigger a sell stop above the stop, then fills through a gap (AC-015-03)", () => {
    const resting = order({
      id: "stop-sell",
      side: "sell",
      order_type: "stop",
      stop_price: 100,
    });
    expect(match(tick(101), [resting], CFG)).toEqual([]);
    const gapped = matchOrders(tick(95), [resting], CFG);
    expect(gapped.triggeredOrderIds).toEqual(["stop-sell"]);
    expect(gapped.fills).toHaveLength(1);
    expect(gapped.fills[0]?.price).toBe(94.91);
    expect(gapped.fills[0]?.price).not.toBe(100);
  });

  it("triggers a buy stop on a gap-through and fills as a market (AC-015-03)", () => {
    const fills = match(
      tick(110),
      [order({ id: "stop-buy", side: "buy", order_type: "stop", stop_price: 105 })],
      CFG,
    );
    expect(fills[0]?.price).toBeCloseTo(110.11, 8);
  });

  it("stop-limit triggers then waits for a marketable limit (AC-015-03)", () => {
    const resting = order({
      id: "sl",
      side: "buy",
      order_type: "stop_limit",
      stop_price: 100,
      limit_price: 101,
    });
    const triggerGap = matchOrders(tick(102), [resting], CFG);
    expect(triggerGap.triggeredOrderIds).toEqual(["sl"]);
    expect(triggerGap.fills).toEqual([]);

    const after = matchOrders(tick(100.5), [{ ...resting, stop_triggered: true }], CFG);
    expect(after.fills[0]?.price).toBe(100.5);
    expect(after.fills[0]?.price).toBeLessThanOrEqual(101);
  });

  it("is deterministic for the same tick, orders, and execConfig", () => {
    const orders = [
      order({ id: "b", side: "buy", order_type: "market", created_at: "2026-09-09T12:00:01Z" }),
      order({ id: "a", side: "buy", order_type: "market", created_at: "2026-09-09T12:00:00Z" }),
    ];
    expect(match(tick(10), orders, CFG)).toEqual(match(tick(10), [...orders].reverse(), CFG));
    expect(match(tick(10), orders, CFG)[0]?.order_id).toBe("a");
  });
});

describe("partial-fill sequencing (AC-015-04)", () => {
  it("caps a fill at liquidity_cap and sequences leftover on the next tick", () => {
    const working = order({ id: "partial", side: "buy", order_type: "market", qty: 100 });
    const first = match(tick(10), [working], { ...CFG, liquidity_cap: 40 });
    expect(first[0]?.qty).toBe(40);
    const second = match(tick(10), [{ ...working, filled_qty: 40 }], { ...CFG, liquidity_cap: 40 });
    expect(second[0]?.qty).toBe(40);
    const third = match(tick(10), [{ ...working, filled_qty: 80 }], { ...CFG, liquidity_cap: 40 });
    expect(third[0]?.qty).toBe(20);
  });

  it("derives a share cap from ADV × table pct without baking the pct into match()", () => {
    const outcome = evaluate(
      baselineTable("DT-EXEC-01"),
      { avg_volume_band: "low", order_notional: 1 },
      new Date(),
    );
    const cfg = parseExecConfig(outcome.outcome);
    expect(cfg?.liquidity_cap_pct_adv).toEqual(expect.any(Number));
    if (!cfg?.liquidity_cap_pct_adv) {
      return;
    }
    const cap = liquidityCapShares(1_000, cfg.liquidity_cap_pct_adv);
    const fills = match(
      tick(10),
      [order({ id: "adv", side: "buy", order_type: "market", qty: 500 })],
      {
        slippage_bps: cfg.slippage_bps,
        liquidity_cap: cap,
      },
    );
    expect(fills[0]?.qty).toBe(cap);
    expect(fills[0]?.qty).toBeLessThan(500);
  });
});
