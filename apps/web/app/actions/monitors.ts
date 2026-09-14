"use server";

import { compileMonitorInstruction } from "@meridian/copilot";
import { authorizeUser } from "@/lib/auth/authorize-user";
import { monitorCreateRequestSchema, type AlertInstance, type Monitor } from "@meridian/schemas";
import { createAlertsRepository } from "@/lib/api/alerts";
import { createAuditLogRepository } from "@/lib/api/audit-log";
import { createRecordsClient } from "@/lib/api/client";
import { createMonitorsRepository } from "@/lib/api/monitors";
import { isAuthStub } from "@/lib/auth/mode";
import { getAccessToken, getSessionUser } from "@/lib/auth/session";
import {
  stubDeleteMonitor,
  stubInsertCopilotMonitor,
  stubListMonitorAlerts,
  stubListMonitors,
  stubPatchMonitor,
} from "@/lib/auth/stub-store";
import { persistCompiledMonitor } from "@/lib/monitors/persist";
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

function records(token: string) {
  const env = readPublicInsforgeEnv();
  return createRecordsClient({
    baseUrl: env.baseUrl,
    getAccessToken: () => token,
  });
}

export async function listMonitorsAction(): Promise<ActionResult<Monitor[]>> {
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
    return { ok: true, data: stubListMonitors(session.userId) };
  }
  const data = await createMonitorsRepository(records(session.token)).listMine();
  return { ok: true, data };
}

export async function listMonitorAlertsAction(
  monitorId: string,
): Promise<ActionResult<AlertInstance[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = await authorizeUser({
    userId: session.userId,
    token: session.token,
    action: "alerts:list",
  });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    return { ok: true, data: stubListMonitorAlerts(session.userId, monitorId) };
  }
  const alerts = await createAlertsRepository(records(session.token)).listMine();
  return { ok: true, data: alerts.filter((row) => row.monitor_id === monitorId) };
}

export async function createMonitorAction(input: unknown): Promise<ActionResult<Monitor>> {
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
  const parsed = monitorCreateRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid monitor." };
  }
  const compiled = compileMonitorInstruction(parsed.data.nl_instruction);
  if (!compiled) {
    return { ok: false, message: "Could not compile that monitor instruction." };
  }
  const row = persistCompiledMonitor({
    userId: session.userId,
    sessionId: parsed.data.session_id ?? null,
    name: parsed.data.name,
    nl_instruction: parsed.data.nl_instruction,
    compiled,
  });
  if (isAuthStub()) {
    const created = stubInsertCopilotMonitor(row);
    return { ok: true, data: created };
  }
  const inserted = await createMonitorsRepository(records(session.token)).insert({
    user_id: row.user_id,
    session_id: row.session_id,
    name: row.name,
    nl_instruction: row.nl_instruction,
    compiled_condition: row.compiled_condition,
    scope: row.scope,
    cadence: row.cadence,
    active: row.active,
    throttle_state: row.throttle_state,
    propose_action: row.propose_action ?? null,
  });
  const created = inserted[0];
  if (!created) {
    return { ok: false, message: "Monitor create failed." };
  }
  await createAuditLogRepository(records(session.token)).insert({
    user_id: session.userId,
    action: "monitors:create",
    entity_type: "monitors",
    entity_id: created.id,
    payload: { name: created.name },
  });
  return { ok: true, data: created };
}

export async function pauseMonitorAction(
  id: string,
  active: boolean,
): Promise<ActionResult<Monitor>> {
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
    const row = stubPatchMonitor(session.userId, id, { active });
    if (!row) {
      return { ok: false, message: "Monitor not found." };
    }
    return { ok: true, data: row };
  }
  const updated = await createMonitorsRepository(records(session.token)).update(id, { active });
  const row = updated[0];
  if (!row) {
    return { ok: false, message: "Monitor not found." };
  }
  await createAuditLogRepository(records(session.token)).insert({
    user_id: session.userId,
    action: active ? "monitors:resume" : "monitors:pause",
    entity_type: "monitors",
    entity_id: id,
    payload: { active },
  });
  return { ok: true, data: row };
}

export async function deleteMonitorAction(id: string): Promise<ActionResult<{ id: string }>> {
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
    stubDeleteMonitor(session.userId, id);
    return { ok: true, data: { id } };
  }
  await createMonitorsRepository(records(session.token)).remove(id);
  await createAuditLogRepository(records(session.token)).insert({
    user_id: session.userId,
    action: "monitors:delete",
    entity_type: "monitors",
    entity_id: id,
    payload: {},
  });
  return { ok: true, data: { id } };
}
