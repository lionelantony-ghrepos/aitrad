import { describe, expect, it } from "vitest";
import { RULES_PUBLISHED_EVENT } from "./rules-cache";
import {
  evaluateDomain,
  handleRulesServiceRequest,
  resolveRulesServiceApiKey,
  type EvaluateDomainPorts,
  type PublishedDomainTable,
  type RulesServicePorts,
} from "./evaluate-domain";
import { PublishedRulesCache } from "./rules-cache";
import { baselineTable } from "./baseline-tables";

const CLOCK = new Date("2026-09-05T16:00:00.000Z");

function memoryPorts(initial: PublishedDomainTable[]): {
  ports: EvaluateDomainPorts;
  audits: Array<Record<string, unknown>>;
  setTables: (next: PublishedDomainTable[]) => void;
  loadCount: { n: number };
} {
  let tables = initial;
  const audits: Array<Record<string, unknown>> = [];
  const loadCount = { n: 0 };
  const ports: EvaluateDomainPorts = {
    async loadPublishedTables(domain) {
      loadCount.n += 1;
      return tables.filter((row) => row.domain === domain);
    },
    async writeRuleAudit(row) {
      const id = `audit-${audits.length + 1}`;
      audits.push({ id, ...row });
      return { id };
    },
  };
  return {
    ports,
    audits,
    loadCount,
    setTables(next) {
      tables = next;
    },
  };
}

describe("TC-011-01 evaluate order_validation writes rule_audit (AC-011-01)", () => {
  it("returns COLLECT outcome and persists table version + matched outcome", async () => {
    const val01 = baselineTable("DT-VAL-01");
    const val02 = baselineTable("DT-VAL-02");
    const { ports, audits } = memoryPorts([
      {
        domain: "order_validation",
        tableKey: "DT-VAL-01",
        version: 1,
        table: val01,
      },
      {
        domain: "order_validation",
        tableKey: "DT-VAL-02",
        version: 1,
        table: val02,
      },
    ]);

    const result = await evaluateDomain(
      "order_validation",
      {
        qty: 0,
        order_type: "limit",
        limit_price: null,
        stop_price: 1,
        side: "buy",
        instrument_status: "active",
        tif: "DAY",
        price_not_on_tick: false,
        group_type: null,
        trail_type: null,
        trail_value: null,
        legs_count: null,
      },
      ports,
      { clock: CLOCK },
    );

    expect(result.auditId).toBe("audit-1");
    expect(result.outcome).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason_code: "VAL_QTY_POSITIVE" }),
        expect.objectContaining({ reason_code: "VAL_LIMIT_REQUIRED" }),
      ]),
    );
    expect(audits).toHaveLength(1);
    expect(audits[0]?.table_versions).toEqual([
      { table_key: "DT-VAL-01", version: 1 },
      { table_key: "DT-VAL-02", version: 1 },
    ]);
    expect(audits[0]?.outcome).toEqual(result.outcome);
    expect(audits[0]?.domain).toBe("order_validation");
    expect(typeof audits[0]?.latency_ms).toBe("number");
  });
});

describe("TC-011-02 publish invalidates cache (AC-011-02)", () => {
  it("edit + rules:published makes the next evaluation use the new row", async () => {
    const original = baselineTable("DT-RISK-01");
    const edited = {
      ...original,
      rows: original.rows.map((row) =>
        row.id === "2"
          ? {
              ...row,
              conditions: row.conditions.map((cell) =>
                cell.input === "order_notional" ? { ...cell, value: 1_000 } : cell,
              ),
            }
          : row,
      ),
    };

    const { ports, setTables, loadCount } = memoryPorts([
      { domain: "pre_trade_risk", tableKey: "DT-RISK-01", version: 1, table: original },
    ]);
    const cache = new PublishedRulesCache();

    const first = await evaluateDomain(
      "pre_trade_risk",
      {
        order_notional: 2_000,
        exceeds_buying_power: false,
        position_pct_post: 1,
        experience_level: "advanced",
        orders_today: 1,
        instrument_beta_class: "low",
        side: "buy",
        exceeds_position_qty: false,
      },
      ports,
      { clock: CLOCK, cache },
    );
    expect(first.outcome).toEqual({ decision: "allow" });
    expect(loadCount.n).toBe(1);

    setTables([{ domain: "pre_trade_risk", tableKey: "DT-RISK-01", version: 2, table: edited }]);

    const cached = await evaluateDomain(
      "pre_trade_risk",
      {
        order_notional: 2_000,
        exceeds_buying_power: false,
        position_pct_post: 1,
        experience_level: "advanced",
        orders_today: 1,
        instrument_beta_class: "low",
        side: "buy",
        exceeds_position_qty: false,
      },
      ports,
      { clock: CLOCK, cache },
    );
    expect(cached.outcome).toEqual({ decision: "allow" });
    expect(loadCount.n).toBe(1);

    cache.invalidate({ event: RULES_PUBLISHED_EVENT });

    const after = await evaluateDomain(
      "pre_trade_risk",
      {
        order_notional: 2_000,
        exceeds_buying_power: false,
        position_pct_post: 1,
        experience_level: "advanced",
        orders_today: 1,
        instrument_beta_class: "low",
        side: "buy",
        exceeds_position_qty: false,
      },
      ports,
      { clock: CLOCK, cache },
    );
    expect(after.outcome).toEqual({
      decision: "reject",
      reason_code: "RISK_MAX_NOTIONAL",
    });
    expect(loadCount.n).toBe(2);
    expect(after.tableVersions).toEqual([{ table_key: "DT-RISK-01", version: 2 }]);
  });
});

function handlerPorts(initial: PublishedDomainTable[]): RulesServicePorts {
  const { ports } = memoryPorts(initial);
  return {
    ...ports,
    async writeAuditLog() {
      return;
    },
  };
}

describe("rules-service request gates", () => {
  it("rejects user publish without entitlements and keeps invalidate service-only", async () => {
    const cache = new PublishedRulesCache();
    const ports = handlerPorts([]);
    const publish = await handleRulesServiceRequest({
      method: "POST",
      body: { op: "publish", tableKey: "DT-RISK-01" },
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      isService: false,
      cache,
      ports,
    });
    expect(publish).toEqual({ status: 403, body: { error: "FORBIDDEN" } });
    const invalidate = await handleRulesServiceRequest({
      method: "POST",
      body: { op: "invalidate" },
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      isService: false,
      cache,
      ports,
    });
    expect(invalidate).toEqual({ status: 403, body: { error: "SERVICE_ONLY" } });
  });

  it("ignores client clock on non-service evaluate", async () => {
    const dated = {
      id: "DT-HRS-01",
      hit_policy: "FIRST" as const,
      default_outputs: { decision: "allow" },
      rows: [
        {
          id: "1",
          priority: 1,
          effective_from: "2019-01-01T00:00:00.000Z",
          effective_to: "2020-01-01T00:00:00.000Z",
          conditions: [{ input: "session", op: "eq" as const, value: "open" }],
          outputs: { decision: "reject", reason_code: "HRS_MARKET_CLOSED" },
        },
      ],
    };
    const cache = new PublishedRulesCache();
    const ports = handlerPorts([
      { domain: "market_hours", tableKey: "DT-HRS-01", version: 1, table: dated },
    ]);
    const result = await handleRulesServiceRequest({
      method: "POST",
      body: {
        domain: "market_hours",
        context: { session: "open" },
        clock: "2019-06-01T00:00:00.000Z",
      },
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      isService: false,
      cache,
      ports,
      clock: new Date("2026-09-05T16:00:00.000Z"),
    });
    expect(result.status).toBe(200);
    const body = result.body as { outcome: { decision: string } };
    expect(body.outcome).toEqual({ decision: "allow" });
  });

  it("fails closed when the function API key is unset", () => {
    expect(resolveRulesServiceApiKey({})).toBeNull();
    expect(resolveRulesServiceApiKey({ API_KEY: "", INSFORGE_API_KEY: "" })).toBeNull();
    expect(resolveRulesServiceApiKey({ API_KEY: "k" })).toBe("k");
  });
});
