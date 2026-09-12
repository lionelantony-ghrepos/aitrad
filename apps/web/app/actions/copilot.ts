"use server";

import { authorizeUser } from "@/lib/auth/authorize-user";
import {
  copilotSessionDetailSchema,
  copilotSessionSchema,
  type CopilotSession,
  type CopilotSessionDetail,
} from "@meridian/schemas";
import { createRecordsClient } from "@/lib/api/client";
import { createCopilotSessionsRepository } from "@/lib/api/copilot-sessions";
import { isAuthStub } from "@/lib/auth/mode";
import { stubListCopilotMessages, stubListCopilotSessions } from "@/lib/auth/stub-store";
import { getAccessToken, getSessionUser } from "@/lib/auth/session";
import { readPublicInsforgeEnv } from "@/lib/insforge/env";

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

export async function listCopilotSessionsAction(): Promise<ActionResult<CopilotSession[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = await authorizeUser({
    userId: session.userId,
    token: session.token,
    action: "copilot:chat",
  });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    return { ok: true, data: stubListCopilotSessions(session.userId) };
  }
  const env = readPublicInsforgeEnv();
  try {
    const repo = createCopilotSessionsRepository(
      createRecordsClient({
        baseUrl: env.baseUrl,
        getAccessToken: () => session.token,
      }),
    );
    return { ok: true, data: copilotSessionSchema.array().parse(await repo.listMine()) };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "SESSION_LIST_FAILED",
    };
  }
}

export async function loadCopilotSessionAction(
  sessionId: string,
): Promise<ActionResult<CopilotSessionDetail>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = await authorizeUser({
    userId: session.userId,
    token: session.token,
    action: "copilot:chat",
  });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    const found = stubListCopilotSessions(session.userId).find((row) => row.id === sessionId);
    if (!found) {
      return { ok: false, message: "SESSION_NOT_FOUND" };
    }
    return {
      ok: true,
      data: copilotSessionDetailSchema.parse({
        session: found,
        messages: stubListCopilotMessages(session.userId, sessionId),
      }),
    };
  }
  const env = readPublicInsforgeEnv();
  try {
    const repo = createCopilotSessionsRepository(
      createRecordsClient({
        baseUrl: env.baseUrl,
        getAccessToken: () => session.token,
      }),
    );
    const sessions = await repo.listMine();
    const found = sessions.find((row) => row.id === sessionId);
    if (!found) {
      return { ok: false, message: "SESSION_NOT_FOUND" };
    }
    return {
      ok: true,
      data: copilotSessionDetailSchema.parse({
        session: found,
        messages: await repo.listMessages(sessionId),
      }),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "SESSION_LOAD_FAILED",
    };
  }
}
