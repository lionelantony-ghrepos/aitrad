import type { OrderStatus } from "@meridian/schemas";
import { summarizeHours, summarizeRisk, summarizeValidation } from "./preview";

export type DomainEval = {
  outcome: unknown;
  auditId: string;
};

export { summarizeHours };

export type PlacementDecision = {
  status: Extract<OrderStatus, "accepted" | "rejected">;
  rejectReason: string | null;
  ruleAuditId: string;
  blockingTable: "DT-VAL-01" | "DT-RISK-01" | "DT-HRS-01" | null;
};

export function decideOrderPlacement(input: {
  validation: DomainEval;
  risk: DomainEval;
  hours: DomainEval;
}): PlacementDecision {
  const valRules = summarizeValidation(input.validation.outcome);
  const valFail = valRules.find((row) => !row.passed);
  if (valFail) {
    return {
      status: "rejected",
      rejectReason: valFail.reason,
      ruleAuditId: input.validation.auditId,
      blockingTable: "DT-VAL-01",
    };
  }
  const risk = summarizeRisk(input.risk.outcome);
  if (!risk.passed) {
    return {
      status: "rejected",
      rejectReason: risk.reason,
      ruleAuditId: input.risk.auditId,
      blockingTable: "DT-RISK-01",
    };
  }
  const hours = summarizeHours(input.hours.outcome);
  if (!hours.passed) {
    return {
      status: "rejected",
      rejectReason: hours.reason,
      ruleAuditId: input.hours.auditId,
      blockingTable: "DT-HRS-01",
    };
  }
  return {
    status: "accepted",
    rejectReason: null,
    ruleAuditId: input.hours.auditId,
    blockingTable: null,
  };
}

export function applyReserveFailure(riskAuditId: string): PlacementDecision {
  return {
    status: "rejected",
    rejectReason: "RISK_BUYING_POWER",
    ruleAuditId: riskAuditId,
    blockingTable: "DT-RISK-01",
  };
}

export async function placeWithReserve(input: {
  validation: DomainEval;
  risk: DomainEval;
  hours: DomainEval;
  reserveAmount: number;
  reserve: (amount: number) => Promise<{ ok: boolean }>;
}): Promise<PlacementDecision & { reserved: number }> {
  const decided = decideOrderPlacement(input);
  if (decided.status === "rejected") {
    return { ...decided, reserved: 0 };
  }
  const reserved = input.reserveAmount;
  if (reserved > 0) {
    const result = await input.reserve(reserved);
    if (!result.ok) {
      return { ...applyReserveFailure(input.risk.auditId), reserved: 0 };
    }
  }
  return { ...decided, reserved };
}
