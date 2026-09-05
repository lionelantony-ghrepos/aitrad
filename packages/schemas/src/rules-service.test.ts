import { describe, expect, it } from "vitest";
import {
  evaluateDomainRequestSchema,
  evaluateDomainResponseSchema,
  ruleAuditInsertSchema,
  ruleDomainSchema,
  tableStatusSchema,
} from "./rules-service";

describe("rules-service DTOs", () => {
  it("parses evaluateDomain request and response", () => {
    const req = evaluateDomainRequestSchema.parse({
      domain: "order_validation",
      context: { qty: 1 },
    });
    expect(req.domain).toBe("order_validation");
    expect(evaluateDomainRequestSchema.safeParse({ domain: "nope", context: {} }).success).toBe(
      false,
    );
    const res = evaluateDomainResponseSchema.parse({
      outcome: { decision: "allow" },
      matchedRows: [],
      trace: [],
      auditId: "11111111-1111-4111-8111-111111111111",
      tableVersions: [{ table_key: "DT-RISK-01", version: 1 }],
    });
    expect(res.auditId).toMatch(/1111/);
  });

  it("accepts table status and rule_audit insert shape", () => {
    expect(tableStatusSchema.parse("published")).toBe("published");
    expect(ruleDomainSchema.parse("fees")).toBe("fees");
    expect(
      ruleAuditInsertSchema.parse({
        domain: "fees",
        table_versions: [{ table_key: "DT-FEE-01", version: 1 }],
        context: { side: "sell" },
        matched_rows: [],
        outcome: { commission_usd: 0 },
        latency_ms: 3,
      }).latency_ms,
    ).toBe(3);
  });
});
