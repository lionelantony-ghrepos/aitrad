import {
  decidePersistedAction,
  evaluateWritePolicyBaseline,
  handleWriteToolCall,
  isWriteTool,
  type WriteActionPorts,
} from "@meridian/copilot";
import type { CopilotAction, WriteToolResult } from "@meridian/schemas";
import { runManualWrite } from "@/lib/copilot/run-manual-write";
import {
  stubCountCopilotActionsToday,
  stubCountCopilotMonitors,
  stubGetCopilotAction,
  stubInsertCopilotAction,
  stubInstrumentBySymbol,
  stubQuoteForInstrument,
  stubReplaceCopilotAction,
  stubRequireOwnedCopilotSession,
} from "@/lib/auth/stub-store";

export function stubWritePorts(userId: string): WriteActionPorts {
  return {
    evaluatePolicy: async (context) => evaluateWritePolicyBaseline(context),
    persistAction: async (row) => {
      if (row.user_id !== userId) {
        throw new Error("ACTION_USER_MISMATCH");
      }
      stubRequireOwnedCopilotSession(userId, row.session_id);
      return stubInsertCopilotAction(row);
    },
    updateAction: async (row) => {
      if (row.user_id !== userId) {
        throw new Error("ACTION_USER_MISMATCH");
      }
      stubRequireOwnedCopilotSession(userId, row.session_id);
      return stubReplaceCopilotAction(row);
    },
    execute: async (tool, payload) => runManualWrite(tool, payload),
  };
}

export async function executeStubWriteTool(input: {
  name: string;
  args: unknown;
  userId: string;
  sessionId: string;
}): Promise<WriteToolResult> {
  if (!isWriteTool(input.name)) {
    throw new Error(`UNKNOWN_TOOL:${input.name}`);
  }
  const args =
    input.name === "propose_order" && input.args && typeof input.args === "object"
      ? enrichOrderLast(input.args as Record<string, unknown>)
      : input.args;
  return handleWriteToolCall({
    userId: input.userId,
    sessionId: input.sessionId,
    tool: input.name,
    args,
    actionsToday: stubCountCopilotActionsToday(input.userId),
    monitorsCount: stubCountCopilotMonitors(input.userId),
    ports: stubWritePorts(input.userId),
  });
}

function enrichOrderLast(args: Record<string, unknown>): Record<string, unknown> {
  if (typeof args.last_price === "number") {
    return args;
  }
  const symbol = typeof args.symbol === "string" ? args.symbol : "";
  const instrument = stubInstrumentBySymbol(symbol);
  const last = instrument ? stubQuoteForInstrument(instrument.id)?.last : undefined;
  return last === undefined ? args : { ...args, last_price: last };
}

export async function decideStubCopilotAction(input: {
  userId: string;
  actionId: string;
  decision: "approve" | "reject";
  feedback?: string;
}): Promise<CopilotAction> {
  const action = stubGetCopilotAction(input.userId, input.actionId);
  if (!action) {
    throw new Error("ACTION_NOT_FOUND");
  }
  return decidePersistedAction({
    action,
    decision: input.decision,
    feedback: input.feedback,
    ports: stubWritePorts(input.userId),
  });
}
