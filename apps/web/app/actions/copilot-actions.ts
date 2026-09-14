"use server";

import { authorizeUser } from "@/lib/auth/authorize-user";
import {
  copilotActionDecideRequestSchema,
  copilotActionSchema,
  type CopilotAction,
} from "@meridian/schemas";
import { decidePersistedAction } from "@meridian/copilot";
import { createRecordsClient } from "@/lib/api/client";
import { createCopilotActionsRepository } from "@/lib/api/copilot-actions";
import { createAuditLogRepository } from "@/lib/api/audit-log";
import { isAuthStub } from "@/lib/auth/mode";
import { getAccessToken, getSessionUser } from "@/lib/auth/session";
import { readPublicInsforgeEnv } from "@/lib/insforge/env";
import { decideStubCopilotAction } from "@/lib/copilot/execute-write-tools";
import { runManualWrite } from "@/lib/copilot/run-manual-write";
import {
  stubAppendCopilotMessage,
  stubAuditCopilot,
  stubListCopilotActions,
  stubListPendingCopilotActions,
} from "@/lib/auth/stub-store";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; message: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

async function requireUser(): Promise<
  { ok: true; userId: string; token: string } | { ok: false; message: string }
> {
  const user = await getSessionUser();
  const token = await getAccessToken();
  if (!user || !token) {
    return { ok: false, message: "You must be signed in." };
  }
  return { ok: true, userId: user.id, token };
}

export async function listCopilotActionsAction(
  sessionId?: string,
): Promise<ActionResult<CopilotAction[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = await authorizeUser({
    userId: session.userId,
    token: session.token,
    action: "copilot:act",
  });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    return {
      ok: true,
      data: sessionId
        ? stubListCopilotActions(session.userId, sessionId)
        : stubListPendingCopilotActions(session.userId),
    };
  }
  const env = readPublicInsforgeEnv();
  const repo = createCopilotActionsRepository(
    createRecordsClient({ baseUrl: env.baseUrl, getAccessToken: () => session.token }),
  );
  const rows = sessionId ? await repo.listBySession(sessionId) : await repo.listMine();
  const parsed = copilotActionSchema.array().parse(rows);
  return {
    ok: true,
    data: sessionId ? parsed : parsed.filter((row) => row.status === "proposed"),
  };
}

export async function decideCopilotActionAction(
  raw: unknown,
): Promise<ActionResult<CopilotAction>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const parsed = copilotActionDecideRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Invalid decision." };
  }
  const gate = await authorizeUser({
    userId: session.userId,
    token: session.token,
    action: "copilot:act",
  });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  try {
    if (isAuthStub()) {
      const row = await decideStubCopilotAction({
        userId: session.userId,
        actionId: parsed.data.action_id,
        decision: parsed.data.decision,
        feedback: parsed.data.feedback,
      });
      stubAuditCopilot(session.userId, `copilot:action:${parsed.data.decision}`, {
        action_id: row.id,
        tool: row.tool,
        status: row.status,
      });
      stubAppendCopilotMessage({
        userId: session.userId,
        sessionId: row.session_id,
        role: "assistant",
        content:
          parsed.data.decision === "reject"
            ? `Rejected ${row.tool}. ${row.reject_reason ?? ""}`.trim()
            : `Approved ${row.tool}.${row.reject_reason ? ` Service: ${row.reject_reason}` : ""}`,
        tool_calls: [],
      });
      return { ok: true, data: row };
    }
    const env = readPublicInsforgeEnv();
    const client = createRecordsClient({
      baseUrl: env.baseUrl,
      getAccessToken: () => session.token,
    });
    const repo = createCopilotActionsRepository(client);
    const existing = await repo.getById(parsed.data.action_id);
    if (!existing || existing.user_id !== session.userId) {
      return { ok: false, message: "ACTION_NOT_FOUND" };
    }
    const row = await decidePersistedAction({
      action: existing,
      decision: parsed.data.decision,
      feedback: parsed.data.feedback,
      ports: {
        evaluatePolicy: async () => ({ decision: "require_approval" }),
        persistAction: async (next) => {
          const inserted = await repo.insert(next);
          return inserted[0] ?? next;
        },
        updateAction: async (next) => {
          const updated = await repo.update(next.id, {
            status: next.status,
            executed_ref: next.executed_ref,
            reject_reason: next.reject_reason,
          });
          return updated[0] ?? next;
        },
        execute: async (tool, payload) => runManualWrite(tool, payload, session.userId),
      },
    });
    await createAuditLogRepository(client).insert({
      user_id: session.userId,
      action: `copilot:action:${parsed.data.decision}`,
      entity_type: "copilot_actions",
      entity_id: row.id,
      payload: { tool: row.tool, status: row.status },
    });
    return { ok: true, data: row };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "ACTION_DECIDE_FAILED",
    };
  }
}
