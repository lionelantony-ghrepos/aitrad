import { baselineTable, evaluate } from "@meridian/rules-engine";
import {
  copilotActionSchema,
  copilotWriteToolNameSchema,
  createAlertToolInputSchema,
  createMonitorToolInputSchema,
  createWatchlistItemToolInputSchema,
  proposeOrderToolInputSchema,
  writeToolResultSchema,
  type CopilotAction,
  type CopilotWriteToolName,
  type WriteToolResult,
} from "@meridian/schemas";
import { isWriteTool, toolByName } from "./tools";

export type WritePolicyDecision = "auto_approve" | "require_approval" | "block" | "rate_limit";

export type WriteExecuteResult = {
  ref?: string;
  error?: string;
  reject_reason?: string;
};

export type WriteActionPorts = {
  now?: () => Date;
  newId?: () => string;
  evaluatePolicy: (context: Record<string, unknown>) => Promise<unknown>;
  persistAction: (row: CopilotAction) => Promise<CopilotAction>;
  updateAction: (row: CopilotAction) => Promise<CopilotAction>;
  execute: (
    tool: CopilotWriteToolName,
    payload: Record<string, unknown>,
  ) => Promise<WriteExecuteResult>;
};

export function parseWriteToolArgs(name: string, args: unknown): Record<string, unknown> {
  const spec = toolByName(name);
  if (!spec || !isWriteTool(name)) {
    throw new Error(`UNKNOWN_WRITE_TOOL:${name}`);
  }
  switch (name) {
    case "create_watchlist_item":
      return createWatchlistItemToolInputSchema.parse(args);
    case "create_alert":
      return createAlertToolInputSchema.parse(args);
    case "propose_order":
      return proposeOrderToolInputSchema.parse(args);
    case "create_monitor":
      return createMonitorToolInputSchema.parse(args);
    default:
      throw new Error(`UNKNOWN_WRITE_TOOL:${name}`);
  }
}

export function orderNotionalFromPayload(payload: Record<string, unknown>): number | undefined {
  const qty = payload.qty;
  const last = payload.last_price;
  if (
    typeof qty !== "number" ||
    typeof last !== "number" ||
    !Number.isFinite(qty) ||
    !Number.isFinite(last)
  ) {
    return undefined;
  }
  return qty * last;
}

export function writePolicyContext(input: {
  tool: CopilotWriteToolName;
  actions_today: number;
  monitors_count: number;
  messages_today?: number;
  payload: Record<string, unknown>;
}): Record<string, unknown> {
  const context: Record<string, unknown> = {
    tool: input.tool,
    actions_today: input.actions_today,
    monitors_count: input.monitors_count,
  };
  if (input.messages_today !== undefined) {
    context.messages_today = input.messages_today;
  }
  const notional = orderNotionalFromPayload(input.payload);
  if (notional !== undefined) {
    context.order_notional = notional;
  }
  return context;
}

export function writeDecisionFromOutcome(outcome: unknown): WritePolicyDecision {
  if (!outcome || typeof outcome !== "object" || !("decision" in outcome)) {
    return "require_approval";
  }
  const decision = (outcome as { decision?: unknown }).decision;
  if (
    decision === "auto_approve" ||
    decision === "require_approval" ||
    decision === "block" ||
    decision === "rate_limit"
  ) {
    return decision;
  }
  return "require_approval";
}

export function evaluateWritePolicyBaseline(
  context: Record<string, unknown>,
  clock = new Date(),
): unknown {
  return evaluate(baselineTable("DT-AI-01"), context, clock).outcome;
}

function iso(date: Date): string {
  return date.toISOString();
}

function newAction(input: {
  userId: string;
  sessionId: string;
  tool: CopilotWriteToolName;
  payload: Record<string, unknown>;
  policyOutcome: unknown;
  status: CopilotAction["status"];
  now: Date;
  id: string;
}): CopilotAction {
  const ts = iso(input.now);
  return copilotActionSchema.parse({
    id: input.id,
    user_id: input.userId,
    session_id: input.sessionId,
    tool: input.tool,
    payload: input.payload,
    policy_outcome: input.policyOutcome,
    status: input.status,
    executed_ref: null,
    reject_reason: null,
    created_at: ts,
    updated_at: ts,
  });
}

async function applyExecution(
  action: CopilotAction,
  ports: WriteActionPorts,
): Promise<CopilotAction> {
  const executed = await ports.execute(action.tool, action.payload);
  const now = ports.now?.() ?? new Date();
  if (executed.error && !executed.ref) {
    return ports.updateAction({
      ...action,
      status: "failed",
      reject_reason: executed.error,
      updated_at: iso(now),
    });
  }
  return ports.updateAction({
    ...action,
    status: "executed",
    executed_ref: executed.ref ?? action.id,
    reject_reason: executed.reject_reason ?? null,
    updated_at: iso(now),
  });
}

export async function handleWriteToolCall(input: {
  userId: string;
  sessionId: string;
  tool: string;
  args: unknown;
  actionsToday: number;
  monitorsCount: number;
  messagesToday?: number;
  ports: WriteActionPorts;
}): Promise<WriteToolResult> {
  const tool = copilotWriteToolNameSchema.parse(input.tool);
  const payload = parseWriteToolArgs(tool, input.args);
  const context = writePolicyContext({
    tool,
    actions_today: input.actionsToday,
    monitors_count: input.monitorsCount,
    messages_today: input.messagesToday,
    payload,
  });
  const policyOutcome = await input.ports.evaluatePolicy(context);
  const decision = writeDecisionFromOutcome(policyOutcome);
  const now = input.ports.now?.() ?? new Date();
  const id = input.ports.newId?.() ?? crypto.randomUUID();

  if (decision === "rate_limit") {
    const message =
      typeof policyOutcome === "object" &&
      policyOutcome &&
      "message" in policyOutcome &&
      typeof (policyOutcome as { message?: unknown }).message === "string"
        ? (policyOutcome as { message: string }).message
        : "Daily copilot quota reached.";
    return writeToolResultSchema.parse({ status: "rate_limited", message });
  }

  if (decision === "block") {
    const action = await input.ports.persistAction(
      newAction({
        userId: input.userId,
        sessionId: input.sessionId,
        tool,
        payload,
        policyOutcome,
        status: "failed",
        now,
        id,
      }),
    );
    return writeToolResultSchema.parse({
      status: "blocked",
      message: `Blocked by AI action policy. ${tool} was not proposed.`,
      action,
    });
  }

  if (decision === "require_approval") {
    const action = await input.ports.persistAction(
      newAction({
        userId: input.userId,
        sessionId: input.sessionId,
        tool,
        payload,
        policyOutcome,
        status: "proposed",
        now,
        id,
      }),
    );
    return writeToolResultSchema.parse({
      status: "awaiting_approval",
      message: `Awaiting user approval for ${tool}. Do not claim it already executed.`,
      action,
    });
  }

  const seeded = await input.ports.persistAction(
    newAction({
      userId: input.userId,
      sessionId: input.sessionId,
      tool,
      payload,
      policyOutcome,
      status: "auto_approved",
      now,
      id,
    }),
  );
  const finished = await applyExecution(seeded, input.ports);
  return writeToolResultSchema.parse({
    status: finished.status === "failed" ? "failed" : "executed",
    message:
      finished.status === "failed"
        ? `Auto-approved ${tool} failed: ${finished.reject_reason ?? "FAILED"}`
        : `${tool} executed.`,
    action: finished,
    executed_ref: finished.executed_ref ?? undefined,
    reject_reason: finished.reject_reason ?? undefined,
  });
}

export async function decidePersistedAction(input: {
  action: CopilotAction;
  decision: "approve" | "reject";
  feedback?: string;
  ports: WriteActionPorts;
}): Promise<CopilotAction> {
  if (input.action.status !== "proposed") {
    throw new Error("ACTION_NOT_PROPOSED");
  }
  const now = input.ports.now?.() ?? new Date();
  if (input.decision === "reject") {
    return input.ports.updateAction({
      ...input.action,
      status: "rejected",
      reject_reason: input.feedback?.trim() || "Rejected by user",
      updated_at: iso(now),
    });
  }
  const approved = await input.ports.updateAction({
    ...input.action,
    status: "approved",
    updated_at: iso(now),
  });
  return applyExecution(approved, input.ports);
}
