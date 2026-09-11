export type OrderCreateResultView = {
  order: {
    status: string;
    reject_reason: string | null;
    rule_audit_id: string | null;
  };
};

export type OrderCreateActionResult =
  { ok: true; data: OrderCreateResultView } | { ok: false; message: string };

export type OrderSubmitUi =
  | { kind: "accepted" }
  | { kind: "rejected"; reason: string; auditLine: string | null }
  | { kind: "error"; message: string };

export const ORDER_REJECTED_FALLBACK = "Order rejected.";

export function ruleAuditLine(ruleAuditId: string | null | undefined): string | null {
  const id = ruleAuditId?.trim();
  if (!id) {
    return null;
  }
  return `Rule audit ID: ${id}`;
}

export function interpretOrderCreateResult(result: OrderCreateActionResult): OrderSubmitUi {
  if (!result.ok) {
    return { kind: "error", message: result.message };
  }
  const order = result.data.order;
  if (order.status === "rejected") {
    const trimmed = order.reject_reason?.trim();
    return {
      kind: "rejected",
      reason: trimmed ? trimmed : ORDER_REJECTED_FALLBACK,
      auditLine: ruleAuditLine(order.rule_audit_id),
    };
  }
  return { kind: "accepted" };
}
