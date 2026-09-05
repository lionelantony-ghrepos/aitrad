import { describe, expect, it } from "vitest";
import {
  rulesAdminRequestSchema,
  rulesAdminRoleSchema,
  simulateResultSchema,
  tableDiffSchema,
} from "./rules-admin";

describe("rules-admin DTOs", () => {
  it("parses catalog, draft, publish, simulate, and audit ops", () => {
    expect(rulesAdminRoleSchema.parse("trader")).toBe("trader");
    expect(rulesAdminRequestSchema.parse({ op: "listCatalog" }).op).toBe("listCatalog");
    expect(
      rulesAdminRequestSchema.parse({
        op: "saveDraft",
        tableKey: "DT-RISK-01",
        table: {
          id: "DT-RISK-01",
          hit_policy: "FIRST",
          default_outputs: { decision: "allow" },
          rows: [],
        },
      }).tableKey,
    ).toBe("DT-RISK-01");
    expect(rulesAdminRequestSchema.safeParse({ op: "publish", tableKey: "" }).success).toBe(false);
  });

  it("parses simulate and diff envelopes", () => {
    const sim = simulateResultSchema.parse({
      sampleSize: 2,
      agreementPct: 50,
      deltas: [
        {
          auditId: "a1",
          publishedOutcome: { decision: "allow" },
          draftOutcome: { decision: "reject" },
          publishedRowIds: ["1"],
          draftRowIds: ["2"],
        },
      ],
    });
    expect(sim.agreementPct).toBe(50);
    const diff = tableDiffSchema.parse({
      tableKey: "DT-RISK-01",
      publishedVersion: 1,
      draftVersion: 2,
      addedRowIds: ["9"],
      removedRowIds: [],
      changedRowIds: ["2"],
    });
    expect(diff.changedRowIds).toEqual(["2"]);
  });
});
