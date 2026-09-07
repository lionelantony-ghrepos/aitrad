import { describe, expect, it } from "vitest";
import {
  BASELINE_TABLE_KEYS,
  DOMAIN_BINDINGS,
  baselineCatalog,
  baselineTable,
} from "./baseline-tables";

describe("TC-011-03 seed catalog covers doc 05 §6 (AC-011-03)", () => {
  it("lists every baseline table as published with a domain binding", () => {
    const catalog = baselineCatalog();
    expect(catalog.tables.map((row) => row.id).sort()).toEqual([...BASELINE_TABLE_KEYS].sort());
    expect(catalog.tables).toHaveLength(12);
    expect(catalog.tables.every((table) => table.rows.length > 0)).toBe(true);
    expect(DOMAIN_BINDINGS.map((b) => b.tableKey).sort()).toEqual([...BASELINE_TABLE_KEYS].sort());
    expect(new Set(DOMAIN_BINDINGS.map((b) => b.domain)).size).toBe(11);
    expect(baselineTable("DT-VAL-01").hit_policy).toBe("COLLECT");
    expect(baselineTable("DT-RISK-01").hit_policy).toBe("FIRST");
    expect(baselineTable("DT-FEE-01").hit_policy).toBe("ALL");
    expect(catalog.published).toBe(true);
  });
});
