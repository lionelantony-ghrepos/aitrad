import { describe, expect, it } from "vitest";
import {
  compileScreenerSql,
  evaluateScreener,
  matchScreenerCriteria,
  screenerCriteriaSchema,
  screenerFieldIdSchema,
  SCREENER_RESULT_LIMIT,
  type ScreenerCriteria,
  type ScreenerFact,
} from "./screener";

const techPeDiv: ScreenerCriteria = {
  combinator: "and",
  groups: [
    {
      combinator: "and",
      conditions: [
        { field: "sector", op: "eq", value: "Technology" },
        { field: "pe", op: "lt", value: 20 },
        { field: "dividend_yield", op: "gt", value: 1 },
      ],
    },
  ],
};

function fact(partial: Partial<ScreenerFact> & Pick<ScreenerFact, "symbol">): ScreenerFact {
  return {
    instrument_id: partial.instrument_id ?? "11111111-1111-4111-8111-111111111111",
    symbol: partial.symbol,
    name: partial.name ?? partial.symbol,
    sector: partial.sector ?? "Technology",
    market_cap_band: partial.market_cap_band ?? "large",
    pe: partial.pe ?? null,
    dividend_yield: partial.dividend_yield ?? null,
    last: partial.last ?? 100,
    prev_close: partial.prev_close ?? 100,
    volume: partial.volume ?? 1_000_000,
    rsi_14: partial.rsi_14 ?? 50,
    week52_low: partial.week52_low ?? 80,
    week52_high: partial.week52_high ?? 120,
  };
}

const oracleUniverse: ScreenerFact[] = [
  fact({
    instrument_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    symbol: "HIT",
    sector: "Technology",
    pe: 15,
    dividend_yield: 2,
  }),
  fact({
    instrument_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    symbol: "HIPE",
    sector: "Technology",
    pe: 25,
    dividend_yield: 2,
  }),
  fact({
    instrument_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
    symbol: "LOWY",
    sector: "Technology",
    pe: 12,
    dividend_yield: 0.5,
  }),
  fact({
    instrument_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
    symbol: "BANK",
    sector: "Financials",
    pe: 10,
    dividend_yield: 3,
  }),
];

describe("TC-021-01 criteria SQL compiler injection (AC-021-01)", () => {
  it("binds user values as jsonb params and rejects identifier injection", () => {
    const injected = "'; DROP TABLE screens; --";
    const compiled = compileScreenerSql({
      criteria: {
        combinator: "and",
        groups: [
          {
            combinator: "and",
            conditions: [{ field: "sector", op: "eq", value: injected }],
          },
        ],
      },
    });
    expect(compiled.sql).not.toContain(injected);
    expect(compiled.sql).not.toMatch(/DROP TABLE/i);
    expect(compiled.sql).toContain("($1->>0)");
    expect(compiled.params).toEqual([injected]);
    expect(compiled.sql).toContain(`LIMIT ${SCREENER_RESULT_LIMIT}`);
    expect(screenerFieldIdSchema.safeParse("sector; DROP TABLE instruments")).toEqual({
      success: false,
      error: expect.any(Object),
    });
    expect(
      screenerCriteriaSchema.safeParse({
        combinator: "and",
        groups: [
          {
            combinator: "and",
            conditions: [{ field: "sector; DROP TABLE", op: "eq", value: "x" }],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      screenerCriteriaSchema.safeParse({
        combinator: "and",
        groups: [
          {
            combinator: "and",
            conditions: [{ field: "sector", op: "eq; DROP", value: "x" }],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("does not interpolate DROP payloads from regex or IN lists", () => {
    const payload = ".*'; DROP TABLE instruments; --";
    const compiled = compileScreenerSql({
      criteria: {
        combinator: "or",
        groups: [
          {
            combinator: "and",
            conditions: [
              { field: "sector", op: "regex", value: payload },
              { field: "sector", op: "in", value: [payload, "Technology"] },
            ],
          },
        ],
      },
    });
    expect(compiled.sql).not.toContain("DROP TABLE");
    expect(compiled.sql).not.toContain(payload);
    expect(compiled.params).toEqual([payload, payload, "Technology"]);
  });
});

describe("TC-021-02 Tech P/E<20 div>1% oracle (AC-021-02)", () => {
  it("matches the in-memory SQL oracle for the fixture universe", () => {
    const compiled = compileScreenerSql({ criteria: techPeDiv });
    expect(compiled.sql).toContain("i.sector");
    expect(compiled.sql).toContain("f.metrics->'valuation'->>'pe'");
    expect(compiled.sql).toContain("f.metrics->'dividends'->>'dividend_yield'");
    expect(compiled.sql).not.toContain("Technology");
    expect(compiled.params).toEqual(["Technology", 20, 1]);

    const result = evaluateScreener(oracleUniverse, { criteria: techPeDiv, op: "run" });
    expect(result.rows.map((row) => row.symbol)).toEqual(["HIT"]);
    expect(result.count).toBe(1);
    expect(result.truncated).toBe(false);
    const hit = oracleUniverse.find((row) => row.symbol === "HIT");
    const hipe = oracleUniverse.find((row) => row.symbol === "HIPE");
    const bank = oracleUniverse.find((row) => row.symbol === "BANK");
    if (!hit || !hipe || !bank) {
      throw new Error("oracle fixture missing");
    }
    expect(matchScreenerCriteria(hit, techPeDiv)).toBe(true);
    expect(matchScreenerCriteria(hipe, techPeDiv)).toBe(false);
    expect(matchScreenerCriteria(bank, techPeDiv)).toBe(false);
  });

  it("compiles one-level AND/OR groups without concatenating identifiers", () => {
    const compiled = compileScreenerSql({
      criteria: {
        combinator: "or",
        groups: [
          {
            combinator: "and",
            conditions: [
              { field: "sector", op: "eq", value: "Technology" },
              { field: "rsi_14", op: "lt", value: 30 },
            ],
          },
          {
            combinator: "and",
            conditions: [{ field: "market_cap_band", op: "in", value: ["mega", "large"] }],
          },
        ],
      },
      sort: { column: "pe", dir: "desc" },
    });
    expect(compiled.sql).toContain(" OR ");
    expect(compiled.sql).toContain(" AND ");
    expect(compiled.sql).toContain("ORDER BY (f.metrics->'valuation'->>'pe')::numeric DESC");
    expect(compiled.params).toEqual(["Technology", 30, "mega", "large"]);
  });
});
