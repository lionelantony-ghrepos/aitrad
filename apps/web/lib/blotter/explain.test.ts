import { describe, expect, it } from "vitest";
import { explainRowsFromAudit } from "./explain";

describe("explainRowsFromAudit TC-017-02", () => {
  it("renders matched rule rows from a rule_audit trace", () => {
    const rows = explainRowsFromAudit({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      domain: "pre_trade_risk",
      context: { qty: 1 },
      outcome: { decision: "deny" },
      matched_rows: [
        {
          id: "DT-RISK-01:max-notional",
          outputs: { reason: "RISK_MAX_NOTIONAL", reason_code: "RISK_MAX_NOTIONAL" },
        },
      ],
    });
    expect(rows).toEqual([
      {
        tableKey: "DT-RISK-01",
        rowId: "DT-RISK-01:max-notional",
        reason: "RISK_MAX_NOTIONAL",
      },
    ]);
  });
});
