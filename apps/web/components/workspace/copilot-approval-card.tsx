"use client";

import { summarizeCopilotAction } from "@meridian/copilot";
import type { CopilotAction } from "@meridian/schemas";
import { decideCopilotActionAction } from "@/app/actions/copilot-actions";
import { notifyOrdersChanged } from "@/lib/orders/orders-live";

type CopilotApprovalCardProps = {
  action: CopilotAction;
  onChange: (next: CopilotAction) => void;
};

export function CopilotApprovalCard({
  action,
  onChange,
}: CopilotApprovalCardProps): React.JSX.Element {
  const pending = action.status === "proposed";

  async function decide(decision: "approve" | "reject"): Promise<void> {
    const result = await decideCopilotActionAction({
      action_id: action.id,
      decision,
    });
    if (!result.ok) {
      return;
    }
    onChange(result.data);
    if (result.data.tool === "propose_order") {
      notifyOrdersChanged();
    }
  }

  return (
    <div
      className="my-1 border border-primary bg-card p-1"
      data-testid="copilot-approval-card"
      data-action-id={action.id}
      data-tool={action.tool}
      data-status={action.status}
    >
      <p className="text-primary">{action.tool.replaceAll("_", " ")}</p>
      <p className="font-mono tabular-nums" data-testid="copilot-approval-summary">
        {summarizeCopilotAction(action)}
      </p>
      <p className="text-muted-foreground" data-testid="copilot-approval-status">
        {action.status}
        {action.reject_reason ? ` · ${action.reject_reason}` : ""}
      </p>
      {pending ? (
        <div className="mt-1 flex gap-1">
          <button
            type="button"
            className="border border-primary px-1 text-primary"
            data-testid="copilot-approve"
            onClick={() => void decide("approve")}
          >
            Approve
          </button>
          <button
            type="button"
            className="border border-border px-1 text-foreground"
            data-testid="copilot-reject"
            onClick={() => void decide("reject")}
          >
            Reject
          </button>
        </div>
      ) : null}
    </div>
  );
}
