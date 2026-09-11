"use server";

import { authorize, compileAlertTemplate, defaultAlertName } from "@meridian/rules-engine";
import {
  alertCreateRequestSchema,
  alertRuleInsertSchema,
  type AlertInstance,
  type AlertKind,
  type AlertRule,
  type QuoteTick,
} from "@meridian/schemas";
import { createAlertRulesRepository, createAlertsRepository } from "@/lib/api/alerts";
import { createAuditLogRepository } from "@/lib/api/audit-log";
import { createRecordsClient } from "@/lib/api/client";
import { createInstrumentsRepository } from "@/lib/api/instruments";
import { createQuotesLatestRepository } from "@/lib/api/quotes-latest";
import { stubEvaluateAlerts } from "@/lib/alerts/evaluate-stub";
import { isAuthStub } from "@/lib/auth/mode";
import { getAccessToken, getSessionUser } from "@/lib/auth/session";
import {
  STUB_INSTRUMENTS,
  stubCreateAlertRule,
  stubDeleteAlertRule,
  stubInstrumentBySymbol,
  stubListAlertRules,
  stubListAlerts,
  stubMarkAlertRead,
  stubPatchAlertRule,
  stubQuoteForInstrument,
} from "@/lib/auth/stub-store";
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

function nowIso(): string {
  return new Date().toISOString();
}

async function resolveInstrumentId(input: {
  token: string;
  instrument_id?: string | null;
  symbol?: string;
}): Promise<{ id: string; symbol: string } | { message: string }> {
  if (isAuthStub()) {
    if (input.instrument_id) {
      const inst = STUB_INSTRUMENTS.find((row) => row.id === input.instrument_id);
      return inst ? { id: inst.id, symbol: inst.symbol } : { message: "Unknown instrument." };
    }
    if (input.symbol) {
      const inst = stubInstrumentBySymbol(input.symbol);
      return inst ? { id: inst.id, symbol: inst.symbol } : { message: "Unknown instrument." };
    }
    return { message: "Pick a symbol." };
  }
  const repo = createInstrumentsRepository(records(input.token));
  if (input.instrument_id) {
    const inst = await repo.getById(input.instrument_id);
    return inst ? { id: inst.id, symbol: inst.symbol } : { message: "Unknown instrument." };
  }
  if (input.symbol) {
    const hits = await repo.list({ symbol: input.symbol.toUpperCase() });
    const inst = hits[0];
    return inst ? { id: inst.id, symbol: inst.symbol } : { message: "Unknown instrument." };
  }
  return { message: "Pick a symbol." };
}

export async function listAlertRulesAction(): Promise<ActionResult<AlertRule[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = authorize({ userId: session.userId, action: "alerts:list" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    return { ok: true, data: stubListAlertRules(session.userId) };
  }
  const data = await createAlertRulesRepository(records(session.token)).listMine();
  return { ok: true, data };
}

export async function listAlertsAction(): Promise<ActionResult<AlertInstance[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = authorize({ userId: session.userId, action: "alerts:read" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    return { ok: true, data: stubListAlerts(session.userId) };
  }
  const data = await createAlertsRepository(records(session.token)).listMine();
  return {
    ok: true,
    data: data.slice().sort((a, b) => b.fired_at.localeCompare(a.fired_at)),
  };
}

export async function createAlertRuleAction(raw: unknown): Promise<ActionResult<AlertRule>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const parsed = alertCreateRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Invalid alert." };
  }
  const gate = authorize({ userId: session.userId, action: "alerts:create" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  const kind = parsed.data.kind as AlertKind;
  let condition;
  try {
    condition = compileAlertTemplate({ kind, threshold: parsed.data.threshold });
  } catch {
    return { ok: false, message: "Enter a threshold." };
  }
  const instrument = await resolveInstrumentId({
    token: session.token,
    instrument_id: parsed.data.instrument_id,
    symbol: parsed.data.symbol,
  });
  if ("message" in instrument) {
    return { ok: false, message: instrument.message };
  }
  const name =
    parsed.data.name?.trim() || defaultAlertName(kind, parsed.data.threshold, instrument.symbol);
  let lastEval: number | null = null;
  if (isAuthStub()) {
    lastEval = stubQuoteForInstrument(instrument.id)?.last ?? null;
  } else {
    const quotes = await createQuotesLatestRepository(records(session.token)).listByInstrumentIds([
      instrument.id,
    ]);
    lastEval = quotes[0]?.last ?? null;
  }
  const insert = alertRuleInsertSchema.parse({
    user_id: session.userId,
    instrument_id: instrument.id,
    name,
    kind,
    condition,
    active: true,
    throttle_state: { last_eval_last: lastEval },
  });
  const ts = nowIso();
  if (isAuthStub()) {
    const row: AlertRule = {
      id: crypto.randomUUID(),
      user_id: insert.user_id,
      instrument_id: insert.instrument_id ?? instrument.id,
      name: insert.name,
      kind: insert.kind,
      condition: insert.condition,
      active: true,
      throttle_state: insert.throttle_state ?? { last_eval_last: lastEval },
      created_at: ts,
      updated_at: ts,
    };
    return { ok: true, data: stubCreateAlertRule(row) };
  }
  const client = records(session.token);
  const created = await createAlertRulesRepository(client).insert(insert);
  const row = created[0];
  if (!row) {
    return { ok: false, message: "Could not create alert." };
  }
  await createAuditLogRepository(client).insert({
    user_id: session.userId,
    action: "alerts:create",
    entity_type: "alert_rules",
    entity_id: row.id,
    payload: { kind, name: row.name },
  });
  return { ok: true, data: row };
}

export async function setAlertRuleActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult<AlertRule>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = authorize({ userId: session.userId, action: "alerts:update" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    const row = stubPatchAlertRule(session.userId, id, { active });
    return row ? { ok: true, data: row } : { ok: false, message: "Alert not found." };
  }
  const client = records(session.token);
  const updated = await createAlertRulesRepository(client).update(id, { active });
  const row = updated[0];
  if (!row) {
    return { ok: false, message: "Alert not found." };
  }
  await createAuditLogRepository(client).insert({
    user_id: session.userId,
    action: "alerts:update",
    entity_type: "alert_rules",
    entity_id: row.id,
    payload: { active },
  });
  return { ok: true, data: row };
}

export async function deleteAlertRuleAction(id: string): Promise<ActionResult<{ id: string }>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = authorize({ userId: session.userId, action: "alerts:delete" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    const ok = stubDeleteAlertRule(session.userId, id);
    return ok ? { ok: true, data: { id } } : { ok: false, message: "Alert not found." };
  }
  const client = records(session.token);
  await createAlertRulesRepository(client).remove(id);
  await createAuditLogRepository(client).insert({
    user_id: session.userId,
    action: "alerts:delete",
    entity_type: "alert_rules",
    entity_id: id,
    payload: {},
  });
  return { ok: true, data: { id } };
}

export async function markAlertReadAction(
  id: string,
  read: boolean,
): Promise<ActionResult<AlertInstance>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = authorize({ userId: session.userId, action: "alerts:update" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    const row = stubMarkAlertRead(session.userId, id, read);
    return row ? { ok: true, data: row } : { ok: false, message: "Alert not found." };
  }
  const client = records(session.token);
  const updated = await createAlertsRepository(client).markRead(id, read);
  const row = updated[0];
  if (!row) {
    return { ok: false, message: "Alert not found." };
  }
  await createAuditLogRepository(client).insert({
    user_id: session.userId,
    action: "alerts:mark_read",
    entity_type: "alerts",
    entity_id: row.id,
    payload: { read },
  });
  return { ok: true, data: row };
}

export async function evaluateAlertsOnTicksAction(
  ticks: QuoteTick[],
): Promise<ActionResult<AlertInstance[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = authorize({ userId: session.userId, action: "alerts:evaluate" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (!isAuthStub()) {
    return { ok: true, data: [] };
  }
  const fired = await stubEvaluateAlerts({ userId: session.userId, ticks });
  return { ok: true, data: fired };
}
