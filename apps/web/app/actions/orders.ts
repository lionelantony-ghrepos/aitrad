"use server";

import { authorizeUser } from "@/lib/auth/authorize-user";
import { canCancel, expandOrderGroup, seedTrailingOnCreate } from "@meridian/paper-engine";
import type { ExecutionRecord, MatchTick, OrderLegRole, RuleAuditView } from "@meridian/schemas";
import {
  orderCancelResponseSchema,
  orderCreateResponseSchema,
  orderDraftSchema,
  orderPreviewResponseSchema,
  ruleAuditViewSchema,
  type Account,
  type Instrument,
  type OrderCancelResponse,
  type OrderCreateResponse,
  type OrderDraft,
  type OrderPreviewResponse,
  type OrderRecord,
  type Profile,
  type QuotesLatest,
} from "@meridian/schemas";
import { createAccountsRepository } from "@/lib/api/accounts";
import { createRecordsClient } from "@/lib/api/client";
import { createExecutionsRepository } from "@/lib/api/executions";
import { createOrdersRepository } from "@/lib/api/orders";
import { createRuleAuditRepository } from "@/lib/api/rule-audit";
import { createInstrumentsRepository } from "@/lib/api/instruments";
import { stubApplyTicks } from "@/lib/orders/stub-matching";
import { invokeOrderCancel, invokeOrderCreate, invokeOrderPreview } from "@/lib/api/order-service";
import { createProfilesRepository } from "@/lib/api/profiles";
import { createQuotesLatestRepository } from "@/lib/api/quotes-latest";
import { isAuthStub } from "@/lib/auth/mode";
import { getAccessToken, getSessionUser } from "@/lib/auth/session";
import {
  stubConsumeForceOrderReject,
  stubGetOrder,
  stubGetRuleAudit,
  stubInsertOrder,
  stubListExecutions,
  stubListOrders,
  stubInstrumentBySymbol,
  stubLoadProvision,
  stubQuotesFor,
  stubReleaseReserve,
  stubReplaceOrder,
  stubRulesMemory,
  stubTryReserve,
} from "@/lib/auth/stub-store";
import { readPublicInsforgeEnv } from "@/lib/insforge/env";
import { runLocalOrderCreate, runLocalOrderPreview } from "@/lib/order-ticket/run-preview";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; message: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

export type OrderTicketContext = {
  account: Account;
  profile: Profile | null;
  instrument: Instrument;
  quote: QuotesLatest | null;
};

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

export async function loadOrderTicketContextAction(
  symbol: string,
): Promise<ActionResult<OrderTicketContext>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = await authorizeUser({
    userId: session.userId,
    action: "trade:preview",
    token: session.token,
  });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  const key = symbol.trim().toUpperCase();
  if (isAuthStub()) {
    const provision = stubLoadProvision(session.userId);
    const instrument = stubInstrumentBySymbol(key);
    if (!provision.account || !instrument) {
      return { ok: false, message: "Account or instrument unavailable." };
    }
    const quote = stubQuotesFor([instrument.id])[0] ?? null;
    return {
      ok: true,
      data: {
        account: provision.account,
        profile: provision.profile,
        instrument,
        quote,
      },
    };
  }
  const client = records(session.token);
  const [accounts, profiles, instruments] = await Promise.all([
    createAccountsRepository(client).listMine(),
    createProfilesRepository(client).listMine(),
    createInstrumentsRepository(client).list({ symbol: key }),
  ]);
  const account = accounts[0];
  const instrument = instruments[0];
  if (!account || !instrument) {
    return { ok: false, message: "Account or instrument unavailable." };
  }
  const quotes = await createQuotesLatestRepository(client).listByInstrumentIds([instrument.id]);
  return {
    ok: true,
    data: {
      account,
      profile: profiles[0] ?? null,
      instrument,
      quote: quotes[0] ?? null,
    },
  };
}

export async function previewOrderAction(input: {
  draft: OrderDraft;
  last_price: number;
}): Promise<ActionResult<OrderPreviewResponse>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = await authorizeUser({
    userId: session.userId,
    action: "trade:preview",
    token: session.token,
  });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  const draft = orderDraftSchema.parse(input.draft);
  if (isAuthStub()) {
    const provision = stubLoadProvision(session.userId);
    const instrument = stubInstrumentBySymbol(draft.symbol);
    if (!provision.account || !instrument) {
      return { ok: false, message: "Account or instrument unavailable." };
    }
    const preview = await runLocalOrderPreview({
      draft,
      lastPrice: input.last_price,
      account: provision.account,
      profile: provision.profile,
      instrument,
      memory: stubRulesMemory(),
    });
    return { ok: true, data: orderPreviewResponseSchema.parse(preview) };
  }
  const env = readPublicInsforgeEnv();
  const preview = await invokeOrderPreview({
    baseUrl: env.baseUrl,
    accessToken: session.token,
    request: { draft, last_price: input.last_price, op: "preview" },
  });
  return { ok: true, data: preview };
}

export async function submitOrderAction(input: {
  draft: OrderDraft;
  last_price: number;
}): Promise<ActionResult<OrderCreateResponse>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = await authorizeUser({
    userId: session.userId,
    action: "trade:create",
    token: session.token,
  });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  const draft = orderDraftSchema.parse(input.draft);
  if (isAuthStub()) {
    const provision = stubLoadProvision(session.userId);
    const instrument = stubInstrumentBySymbol(draft.symbol);
    if (!provision.account || !instrument) {
      return { ok: false, message: "Account or instrument unavailable." };
    }
    const forceReject = stubConsumeForceOrderReject(session.userId);
    const { preview, placement } = await runLocalOrderCreate({
      draft,
      lastPrice: input.last_price,
      account: provision.account,
      profile: provision.profile,
      instrument,
      memory: stubRulesMemory(),
      reserve: async (amount) => {
        if (forceReject) {
          return { ok: false };
        }
        return { ok: stubTryReserve(session.userId, amount) };
      },
    });
    const now = new Date().toISOString();
    const legs = expandOrderGroup(draft);
    const groupId = legs.length > 1 ? crypto.randomUUID() : null;
    const parentId = crypto.randomUUID();
    const created: OrderRecord[] = [];
    for (const [index, leg] of legs.entries()) {
      const trailSeed = seedTrailingOnCreate(
        {
          side: leg.draft.side,
          trail_type: leg.trail_type,
          trail_value: leg.trail_value,
          high_water_mark: null,
          stop_price: leg.draft.stop_price ?? null,
        },
        input.last_price,
      );
      const isParent = index === 0;
      const order: OrderRecord = {
        id: isParent ? parentId : crypto.randomUUID(),
        user_id: session.userId,
        account_id: provision.account.id,
        instrument_id: instrument.id,
        symbol: leg.draft.symbol,
        side: leg.draft.side,
        qty: leg.draft.qty,
        filled_qty: 0,
        order_type: leg.draft.order_type,
        limit_price: leg.draft.limit_price ?? null,
        stop_price: trailSeed.stop_price,
        tif: leg.draft.tif,
        status: placement.status,
        reject_reason: isParent ? placement.rejectReason : null,
        rule_audit_id: placement.ruleAuditId,
        parent_order_id: isParent ? null : parentId,
        group_id: groupId,
        group_type: draft.group_type ?? null,
        leg_role: (leg.leg_role ?? null) as OrderLegRole | null,
        group_activated: placement.status === "accepted" ? leg.group_activated : false,
        trail_type: leg.trail_type ?? null,
        trail_value: leg.trail_value ?? null,
        high_water_mark: trailSeed.high_water_mark,
        reserved_amount: isParent ? placement.reserved : 0,
        created_at: now,
        updated_at: now,
      };
      stubInsertOrder(order);
      created.push(order);
    }
    const order = created[0];
    if (!order) {
      return { ok: false, message: "Order create failed." };
    }
    return { ok: true, data: orderCreateResponseSchema.parse({ order, preview }) };
  }
  const env = readPublicInsforgeEnv();
  try {
    const created = await invokeOrderCreate({
      baseUrl: env.baseUrl,
      accessToken: session.token,
      request: { draft, last_price: input.last_price, op: "create" },
    });
    return { ok: true, data: created };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Order submit failed.",
    };
  }
}

export async function cancelOrderAction(
  orderId: string,
): Promise<ActionResult<OrderCancelResponse>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = await authorizeUser({
    userId: session.userId,
    action: "trade:cancel",
    token: session.token,
  });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    const existing = stubGetOrder(session.userId, orderId);
    if (!existing) {
      return { ok: false, message: "Order not found." };
    }
    if (!canCancel(existing.status)) {
      return { ok: false, message: `FSM_ILLEGAL:${existing.status}->cancelled` };
    }
    const held = existing.reserved_amount ?? 0;
    if (held > 0) {
      stubReleaseReserve(session.userId, held);
    }
    const cancelled: OrderRecord = {
      ...existing,
      status: "cancelled",
      reserved_amount: 0,
      updated_at: new Date().toISOString(),
    };
    stubReplaceOrder(cancelled);
    return { ok: true, data: orderCancelResponseSchema.parse({ order: cancelled }) };
  }
  const env = readPublicInsforgeEnv();
  const cancelled = await invokeOrderCancel({
    baseUrl: env.baseUrl,
    accessToken: session.token,
    orderId,
  });
  return { ok: true, data: cancelled };
}

export async function listOrdersAction(): Promise<ActionResult<OrderRecord[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  if (isAuthStub()) {
    return { ok: true, data: stubListOrders(session.userId) };
  }
  const client = records(session.token);
  const rows = await createOrdersRepository(client).listMine();
  return { ok: true, data: rows };
}

export async function listExecutionsAction(
  orderId?: string,
): Promise<ActionResult<ExecutionRecord[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  if (isAuthStub()) {
    return { ok: true, data: stubListExecutions(session.userId, orderId) };
  }
  const client = records(session.token);
  const repo = createExecutionsRepository(client);
  const rows = orderId ? await repo.listByOrderId(orderId) : await repo.listMine();
  return { ok: true, data: rows };
}

export async function getRuleAuditAction(auditId: string): Promise<ActionResult<RuleAuditView>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  if (isAuthStub()) {
    const row = stubGetRuleAudit(auditId);
    if (!row) {
      return { ok: false, message: "Rule audit not found." };
    }
    return { ok: true, data: ruleAuditViewSchema.parse(row) };
  }
  const client = records(session.token);
  const rows = await createRuleAuditRepository(client).getById(auditId);
  const row = rows[0];
  if (!row) {
    return { ok: false, message: "Rule audit not found." };
  }
  return { ok: true, data: row };
}

export async function applyPaperTicksAction(
  ticks: MatchTick[],
): Promise<ActionResult<OrderRecord[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  if (isAuthStub()) {
    return { ok: true, data: stubApplyTicks(session.userId, ticks) };
  }
  return listOrdersAction();
}
