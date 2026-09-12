import { describe, expect, it } from "vitest";
import {
  interpretOrderCreateResult,
  ORDER_REJECTED_FALLBACK,
  ruleAuditLine,
} from "./submit-result";

const auditId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("interpretOrderCreateResult", () => {
  it("keeps accepted creates as accepted", () => {
    expect(
      interpretOrderCreateResult({
        ok: true,
        data: {
          order: { status: "accepted", reject_reason: null, rule_audit_id: auditId },
        },
      }),
    ).toEqual({ kind: "accepted" });
  });

  it("surfaces reject_reason and rule_audit_id when ok with status rejected", () => {
    expect(
      interpretOrderCreateResult({
        ok: true,
        data: {
          order: {
            status: "rejected",
            reject_reason: "RISK_BUYING_POWER",
            rule_audit_id: auditId,
          },
        },
      }),
    ).toEqual({
      kind: "rejected",
      reason: "RISK_BUYING_POWER",
      auditLine: `Rule audit ID: ${auditId}`,
    });
  });

  it("uses a fallback reason when rejected without reject_reason", () => {
    expect(
      interpretOrderCreateResult({
        ok: true,
        data: {
          order: { status: "rejected", reject_reason: "  ", rule_audit_id: null },
        },
      }),
    ).toEqual({
      kind: "rejected",
      reason: ORDER_REJECTED_FALLBACK,
      auditLine: null,
    });
  });

  it("treats action errors as errors without closing", () => {
    expect(interpretOrderCreateResult({ ok: false, message: "Not allowed." })).toEqual({
      kind: "error",
      message: "Not allowed.",
    });
  });
});

describe("ruleAuditLine", () => {
  it("omits blank audit ids", () => {
    expect(ruleAuditLine(null)).toBeNull();
    expect(ruleAuditLine("")).toBeNull();
    expect(ruleAuditLine("  ")).toBeNull();
  });
});
