import { describe, expect, it } from "vitest";
import { compile, evaluate, type DecisionTable } from "./evaluate";
import { dtEnt01, dtFee01, dtRisk01, dtVal01, dtVal02Trail } from "./doc05-fixtures";

const CLOCK = new Date("2026-09-05T16:00:00.000Z");

describe("TC-010-01 fixture tables doc 05 §7 (AC-010-01)", () => {
  it("FIRST + priority: rows 2 and 4 of DT-RISK-01 match, row 2 wins", () => {
    const result = evaluate(
      dtRisk01,
      {
        order_notional: 60_000,
        buying_power: 100_000,
        exceeds_buying_power: false,
        position_pct_post: 45,
        experience_level: "intermediate",
        orders_today: 1,
        instrument_beta_class: "low",
        side: "buy",
        qty: 10,
        position_qty: 10,
      },
      CLOCK,
    );

    expect(result.matchedRows.map((row) => row.id)).toEqual(["2", "4"]);
    expect(result.outcome).toEqual({
      decision: "reject",
      reason_code: "RISK_MAX_NOTIONAL",
    });
  });

  it("COLLECT: DT-VAL-01 qty=0 and null limit on a limit order returns both rejects", () => {
    const result = evaluate(
      dtVal01,
      {
        qty: 0,
        order_type: "limit",
        limit_price: null,
        stop_price: 1,
        side: "buy",
        last_price: 10,
        instrument_status: "active",
        tif: "DAY",
        price_not_on_tick: false,
      },
      CLOCK,
    );

    expect(result.outcome).toEqual([
      {
        decision: "reject",
        reason_code: "VAL_QTY_POSITIVE",
        message: "Quantity must be positive.",
      },
      { decision: "reject", reason_code: "VAL_LIMIT_REQUIRED" },
    ]);
  });

  it("ALL merge: DT-FEE-01 sell for pro merges commission, sec/taf, and data fee", () => {
    const result = evaluate(
      dtFee01,
      { side: "sell", account_tier: "pro", notional: 1000, qty: 10 },
      CLOCK,
    );

    expect(result.outcome).toEqual({
      commission_usd: 0,
      sec_fee: "notional_x_sec_rate",
      taf: "qty_x_taf_capped",
      data_fee_monthly: 0,
    });
  });

  it("Defaults: DT-ENT-01 unknown role yields deny", () => {
    const result = evaluate(dtEnt01, { role: "unknown", action: "trade:buy" }, CLOCK);
    expect(result.matchedRows).toEqual([]);
    expect(result.outcome).toEqual({ decision: "deny" });
  });

  it("between: trail_value 0.05 ⇒ VAL_TRAIL_RANGE; 0.1 ⇒ valid (inclusive)", () => {
    const reject = evaluate(dtVal02Trail, { trail_type: "percent", trail_value: 0.05 }, CLOCK);
    expect(reject.outcome).toEqual([{ decision: "reject", reason_code: "VAL_TRAIL_RANGE" }]);

    const ok = evaluate(dtVal02Trail, { trail_type: "percent", trail_value: 0.1 }, CLOCK);
    expect(ok.matchedRows).toEqual([]);
    expect(ok.outcome).toEqual([{ decision: "valid" }]);
  });

  it("any operator: DT-FEE-01 row 1 matches every context", () => {
    const result = evaluate(dtFee01, { side: "buy", account_tier: "retail" }, CLOCK);
    expect(result.matchedRows.some((row) => row.id === "1")).toBe(true);
    expect(result.outcome).toMatchObject({ commission_usd: 0 });
  });
});

describe("TC-010-02 effective dating (AC-010-02)", () => {
  it("row expiring yesterday is not matched with today's clock", () => {
    const table: DecisionTable = {
      id: "DT-EFFECTIVE",
      hit_policy: "FIRST",
      default_outputs: { decision: "default" },
      rows: [
        {
          id: "expired",
          priority: 1,
          effective_from: null,
          effective_to: "2026-09-04T00:00:00.000Z",
          conditions: [{ input: "flag", op: "eq", value: true }],
          outputs: { decision: "expired-hit" },
        },
        {
          id: "open",
          priority: 2,
          effective_from: "2026-09-05T00:00:00.000Z",
          effective_to: null,
          conditions: [{ input: "flag", op: "eq", value: true }],
          outputs: { decision: "open-hit" },
        },
      ],
    };

    const result = evaluate(table, { flag: true }, CLOCK);
    expect(result.matchedRows.map((row) => row.id)).toEqual(["open"]);
    expect(result.outcome).toEqual({ decision: "open-hit" });
  });
});

describe("TC-010-03 trace snapshot (AC-010-03)", () => {
  it("FIRST evaluation exposes per-row condition booleans for all rows", () => {
    const result = evaluate(
      dtRisk01,
      {
        order_notional: 60_000,
        buying_power: 100_000,
        exceeds_buying_power: false,
        position_pct_post: 45,
        experience_level: "intermediate",
        orders_today: 1,
        instrument_beta_class: "low",
        side: "buy",
        qty: 10,
        position_qty: 10,
      },
      CLOCK,
    );

    expect(result.trace).toMatchSnapshot();
    expect(result.trace).toHaveLength(dtRisk01.rows.length);
    for (const entry of result.trace) {
      expect(entry.cells.every((cell) => typeof cell.passed === "boolean")).toBe(true);
    }
  });
});

describe("operators and hit-policy branches", () => {
  const clock = CLOCK;

  function oneCell(
    op: DecisionTable["rows"][number]["conditions"][number]["op"],
    value: unknown,
    context: Record<string, unknown>,
    extras?: Partial<DecisionTable["rows"][number]["conditions"][number]>,
  ) {
    const table: DecisionTable = {
      id: "DT-OP",
      hit_policy: "FIRST",
      default_outputs: { hit: false },
      rows: [
        {
          id: "r",
          priority: 1,
          conditions: [{ input: "x", op, value, ...extras }],
          outputs: { hit: true },
        },
      ],
    };
    return evaluate(table, context, clock).outcome;
  }

  it("covers eq, neq, lt, lte, gt, gte, in, not_in, regex, is_null", () => {
    expect(oneCell("eq", 2, { x: 2 })).toEqual({ hit: true });
    expect(oneCell("eq", 2, { x: 3 })).toEqual({ hit: false });
    expect(oneCell("neq", 2, { x: 3 })).toEqual({ hit: true });
    expect(oneCell("lt", 5, { x: 1 })).toEqual({ hit: true });
    expect(oneCell("lte", 5, { x: 5 })).toEqual({ hit: true });
    expect(oneCell("gt", 5, { x: 6 })).toEqual({ hit: true });
    expect(oneCell("gte", 5, { x: 5 })).toEqual({ hit: true });
    expect(oneCell("lt", 5, { x: 9 })).toEqual({ hit: false });
    expect(oneCell("in", ["a", "b"], { x: "b" })).toEqual({ hit: true });
    expect(oneCell("in", ["a", "b"], { x: "c" })).toEqual({ hit: false });
    expect(oneCell("not_in", ["a", "b"], { x: "c" })).toEqual({ hit: true });
    expect(oneCell("not_in", ["a", "b"], { x: "a" })).toEqual({ hit: false });
    expect(oneCell("regex", "^NV", { x: "NVDA" })).toEqual({ hit: true });
    expect(oneCell("regex", "^NV", { x: "AAPL" })).toEqual({ hit: false });
    expect(oneCell("is_null", undefined, { x: null })).toEqual({ hit: true });
    expect(oneCell("is_null", undefined, {})).toEqual({ hit: true });
    expect(oneCell("is_null", undefined, { x: 0 })).toEqual({ hit: false });
  });

  it("treats incomparable relational operands and bad regex as non-match", () => {
    expect(oneCell("gt", 1, { x: "nope" })).toEqual({ hit: false });
    expect(oneCell("between", [1, 2], { x: "nope" })).toEqual({ hit: false });
    expect(oneCell("regex", "[", { x: "ab" })).toEqual({ hit: false });
    expect(oneCell("regex", "^1", { x: 12 })).toEqual({ hit: true });
    expect(oneCell("regex", 1, { x: "1" })).toEqual({ hit: false });
    expect(oneCell("in", "a", { x: "a" })).toEqual({ hit: false });
    expect(oneCell("not_in", "a", { x: "z" })).toEqual({ hit: false });
    expect(oneCell("between", [1], { x: 1 })).toEqual({ hit: false });
    expect(oneCell("gt", 1, { x: Number.NaN })).toEqual({ hit: false });
    expect(oneCell("gt", Number.NaN, { x: 1 })).toEqual({ hit: false });
    expect(oneCell("eq", "same", { x: "same" })).toEqual({ hit: true });
  });

  it("compares ISO date strings and numbers for ordering", () => {
    expect(oneCell("lt", "2026-09-05", { x: "2026-09-04" })).toEqual({ hit: true });
    expect(oneCell("gte", "10", { x: "10" })).toEqual({ hit: true });
    expect(oneCell("gt", "a", { x: "b" })).toEqual({ hit: true });
    expect(oneCell("gte", 10, { x: 10 })).toEqual({ hit: true });
  });

  it("ALL with no matches returns default_outputs; later rows override keys", () => {
    const empty = evaluate(
      {
        id: "DT-ALL-EMPTY",
        hit_policy: "ALL",
        default_outputs: { a: 1 },
        rows: [
          {
            id: "1",
            priority: 1,
            conditions: [{ input: "x", op: "eq", value: true }],
            outputs: { a: 2 },
          },
        ],
      },
      { x: false },
      clock,
    );
    expect(empty.outcome).toEqual({ a: 1 });

    const merged = evaluate(
      {
        id: "DT-ALL-OVR",
        hit_policy: "ALL",
        default_outputs: { a: 0, b: 0 },
        rows: [
          {
            id: "1",
            priority: 1,
            conditions: [{ input: "x", op: "any" }],
            outputs: { a: 1, b: 1 },
          },
          {
            id: "2",
            priority: 2,
            conditions: [{ input: "x", op: "any" }],
            outputs: { b: 2 },
          },
        ],
      },
      {},
      clock,
    );
    expect(merged.outcome).toEqual({ a: 1, b: 2 });
  });

  it("COLLECT with matches does not wrap defaults; interpolates ${field} in messages only", () => {
    const result = evaluate(
      {
        id: "DT-MSG",
        hit_policy: "COLLECT",
        default_outputs: { decision: "valid" },
        rows: [
          {
            id: "1",
            priority: 1,
            conditions: [{ input: "x", op: "eq", value: true }],
            outputs: { message: "cap is ${max}" },
          },
        ],
      },
      { x: true, max: 9 },
      clock,
    );
    expect(result.outcome).toEqual([{ message: "cap is 9" }]);
  });

  it("empty condition list matches when the row is effective", () => {
    const result = evaluate(
      {
        id: "DT-EMPTY",
        hit_policy: "FIRST",
        default_outputs: { hit: false },
        rows: [{ id: "1", priority: 1, conditions: [], outputs: { hit: true } }],
      },
      {},
      clock,
    );
    expect(result.outcome).toEqual({ hit: true });
  });

  it("effective_from equal to clock is included; effective_to equal to clock is excluded", () => {
    const iso = CLOCK.toISOString();
    const table: DecisionTable = {
      id: "DT-BOUNDS",
      hit_policy: "COLLECT",
      default_outputs: { decision: "none" },
      rows: [
        {
          id: "from-eq",
          priority: 1,
          effective_from: iso,
          effective_to: null,
          conditions: [{ input: "x", op: "any" }],
          outputs: { id: "from-eq" },
        },
        {
          id: "to-eq",
          priority: 2,
          effective_from: null,
          effective_to: iso,
          conditions: [{ input: "x", op: "any" }],
          outputs: { id: "to-eq" },
        },
      ],
    };
    const result = evaluate(table, {}, CLOCK);
    expect(result.matchedRows.map((row) => row.id)).toEqual(["from-eq"]);
  });

  it("interpolates missing context fields to empty and treats blank effective dates as open", () => {
    const result = evaluate(
      {
        id: "DT-INTERP",
        hit_policy: "FIRST",
        default_outputs: { message: "hi ${missing}" },
        rows: [
          {
            id: "1",
            priority: 1,
            effective_from: "",
            effective_to: "",
            conditions: [{ input: "x", op: "eq", value: true }],
            outputs: { message: "cap ${missing}" },
          },
        ],
      },
      { x: true },
      clock,
    );
    expect(result.outcome).toEqual({ message: "cap " });
    expect(
      evaluate(
        {
          id: "DT-DEF-MSG",
          hit_policy: "FIRST",
          default_outputs: { message: "hi ${missing}" },
          rows: [
            {
              id: "1",
              priority: 1,
              conditions: [{ input: "x", op: "eq", value: true }],
              outputs: { hit: true },
            },
          ],
        },
        { x: false },
        clock,
      ).outcome,
    ).toEqual({ message: "hi " });
  });

  it("compile parses the table and evaluate rejects invalid tables", () => {
    const compiled = compile(dtEnt01);
    expect(compiled.evaluate({ role: "ghost", action: "x" }, CLOCK).outcome).toEqual({
      decision: "deny",
    });
    expect(() => compile({ id: "bad" })).toThrow();
    expect(() => evaluate({ id: "bad" } as DecisionTable, {}, CLOCK)).toThrow();
  });
});
