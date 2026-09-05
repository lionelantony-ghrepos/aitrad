import { describe, expect, it } from "vitest";
import { baselineTable } from "./baseline-tables";
import {
  diffDecisionTables,
  entitlementAllows,
  filterRuleAudits,
  groupTablesByDomain,
  inferConditionCellKind,
  reorderDecisionRows,
  simulateDraftAgainstAudits,
} from "./rules-admin";

describe("rules admin helpers", () => {
  it("groups catalog rows by domain", () => {
    const grouped = groupTablesByDomain([
      { tableKey: "DT-VAL-01", domain: "order_validation", publishedVersion: 1 },
      { tableKey: "DT-RISK-01", domain: "pre_trade_risk", publishedVersion: 1 },
      { tableKey: "DT-VAL-02", domain: "order_validation", publishedVersion: 1 },
    ]);
    expect(grouped.map((g) => g.domain)).toEqual(["order_validation", "pre_trade_risk"]);
    expect(grouped[0]?.tables.map((t) => t.tableKey)).toEqual(["DT-VAL-01", "DT-VAL-02"]);
  });

  it("diffs draft vs published by row id", () => {
    const published = baselineTable("DT-RISK-01");
    const draft = {
      ...published,
      rows: published.rows.map((row) =>
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
    const diff = diffDecisionTables(published, draft);
    expect(diff.changedRowIds).toEqual(["2"]);
    expect(diff.addedRowIds).toEqual([]);
    expect(diff.removedRowIds).toEqual([]);
  });

  it("reorders rows and renumbers priority from 1", () => {
    const rows = [
      { id: "a", priority: 1, conditions: [], outputs: {} },
      { id: "b", priority: 2, conditions: [], outputs: {} },
      { id: "c", priority: 3, conditions: [], outputs: {} },
    ];
    const next = reorderDecisionRows(rows, 2, 0);
    expect(next.map((r) => r.id)).toEqual(["c", "a", "b"]);
    expect(next.map((r) => r.priority)).toEqual([1, 2, 3]);
  });

  it("simulates draft vs published on stored audit contexts", () => {
    const published = baselineTable("DT-RISK-01");
    const draft = {
      ...published,
      rows: published.rows.map((row) =>
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
    const result = simulateDraftAgainstAudits({
      published,
      draft,
      clock: new Date("2026-09-05T16:00:00.000Z"),
      audits: [
        {
          id: "agree",
          context: {
            order_notional: 100,
            exceeds_buying_power: false,
            position_pct_post: 1,
            experience_level: "advanced",
            orders_today: 1,
            instrument_beta_class: "low",
            side: "buy",
            exceeds_position_qty: false,
          },
        },
        {
          id: "delta",
          context: {
            order_notional: 2_000,
            exceeds_buying_power: false,
            position_pct_post: 1,
            experience_level: "advanced",
            orders_today: 1,
            instrument_beta_class: "low",
            side: "buy",
            exceeds_position_qty: false,
          },
        },
      ],
    });
    expect(result.sampleSize).toBe(2);
    expect(result.agreementPct).toBe(50);
    expect(result.deltas).toHaveLength(1);
    expect(result.deltas[0]?.auditId).toBe("delta");
    expect(result.deltas[0]?.draftRowIds).toContain("2");
  });

  it("infers typed cells without encoding policy values", () => {
    expect(inferConditionCellKind("side", "eq")).toBe("enum");
    expect(inferConditionCellKind("order_notional", "gt")).toBe("number");
    expect(inferConditionCellKind("qty", "between")).toBe("range");
    expect(inferConditionCellKind("symbol", "eq")).toBe("symbol");
    expect(inferConditionCellKind("reason", "eq")).toBe("text");
  });

  it("filters rule_audit traces by domain or free text", () => {
    const rows = [
      {
        id: "1",
        domain: "pre_trade_risk",
        outcome: { decision: "reject", reason_code: "RISK_MAX_NOTIONAL" },
        context: { order_notional: 9 },
      },
      {
        id: "2",
        domain: "fees",
        outcome: { decision: "allow" },
        context: {},
      },
    ];
    expect(filterRuleAudits(rows, "pre_trade").map((r) => r.id)).toEqual(["1"]);
    expect(filterRuleAudits(rows, "RISK_MAX").map((r) => r.id)).toEqual(["1"]);
  });

  it("reads entitlement allow/deny from an evaluated outcome", () => {
    expect(entitlementAllows({ decision: "allow" })).toBe(true);
    expect(entitlementAllows({ decision: "deny" })).toBe(false);
    expect(entitlementAllows({ decision: "allow" })).toBe(true);
  });
});
