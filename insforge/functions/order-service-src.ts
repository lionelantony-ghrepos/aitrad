/**
 * Orchestration source for `order-service`. Deno deploy is a single file:
 * bundle to `order-service.ts` with esbuild (`--external:npm:@insforge/sdk`).
 */
import { createAdminClient, createClient } from "npm:@insforge/sdk";
import {
  nyClockParts,
  nyseSessionState,
  type MarketCalendarRow,
} from "../../packages/mock-data/src/index.ts";
import {
  evaluateDomainResponseSchema,
  orderCancelRequestSchema,
  orderCreateRequestSchema,
  orderDraftSchema,
  orderPreviewRequestSchema,
  orderRecordSchema,
  uuidSchema,
  type EvaluateDomainResponse,
  type OrderDraft,
  type OrderPreviewResponse,
  type OrderRecord,
  type OrderStatus,
} from "../../packages/schemas/src/index.ts";
import {
  assemblePreview,
  buildOrderFacts,
  canCancel,
  expandOrderGroup,
  lastPriceForRuleFacts,
  placeWithReserve,
  reserveAmountForSide,
  seedTrailingOnCreate,
} from "../../packages/paper-engine/src/index.ts";
import type { OrderLegRole } from "../../packages/schemas/src/index.ts";
import { authorize, resolveRulesServiceApiKey } from "../../packages/rules-engine/src/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Op = "preview" | "create" | "cancel";

function pathOp(req: Request): { op: Op; orderId?: string } | null {
  const pathname = new URL(req.url).pathname.replace(/\/+$/, "");
  const cancelMatch = /\/orders\/([^/]+)\/cancel$/.exec(pathname);
  if (cancelMatch?.[1]) {
    return { op: "cancel", orderId: cancelMatch[1] };
  }
  if (pathname.endsWith("/preview")) {
    return { op: "preview" };
  }
  if (pathname.endsWith("/orders")) {
    return { op: "create" };
  }
  return null;
}

async function evaluateRemote(input: {
  baseUrl: string;
  accessToken: string;
  domain: "order_validation" | "pre_trade_risk" | "market_hours" | "fees";
  context: Record<string, unknown>;
}): Promise<EvaluateDomainResponse> {
  const response = await fetch(`${input.baseUrl.replace(/\/+$/, "")}/functions/rules-service`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ domain: input.domain, context: input.context }),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(`RULES_SERVICE_${response.status}`);
  }
  return evaluateDomainResponseSchema.parse(body);
}

function asRecord(outcome: EvaluateDomainResponse["outcome"]): Record<string, unknown> {
  if (Array.isArray(outcome)) {
    return Object.assign({}, ...outcome) as Record<string, unknown>;
  }
  return outcome;
}

type UserClient = ReturnType<typeof createClient>;
type AdminClient = ReturnType<typeof createAdminClient>;

type LoadedCtx = {
  account: { id: string; cash_balance: string | number; reserved_cash?: string | number };
  profile: { experience_level: string | null } | null;
  instrument: {
    id: string;
    status: string;
    tick_size: string | number;
    beta_class: string | null;
  };
  lastPrice: number;
  positionQty: number;
  ordersToday: number;
  session: "open" | "closed";
};

function buyingPowerOf(account: LoadedCtx["account"]): number {
  return Number(account.cash_balance) - Number(account.reserved_cash ?? 0);
}

function hydrateOrderRow(existing: Record<string, unknown>): Record<string, unknown> {
  return {
    ...existing,
    parent_order_id: existing.parent_order_id ?? null,
    group_id: existing.group_id ?? null,
    group_type: existing.group_type ?? null,
    leg_role: existing.leg_role ?? null,
    group_activated: existing.group_activated ?? true,
    trail_type: existing.trail_type ?? null,
    trail_value: existing.trail_value ?? null,
    high_water_mark: existing.high_water_mark ?? null,
    reserved_amount: existing.reserved_amount ?? 0,
  };
}

async function loadCalendar(client: UserClient): Promise<MarketCalendarRow[]> {
  const { data, error } = await client.database
    .from("market_calendar")
    .select("session_date,venue,session_kind,open_minute,close_minute");
  if (error) {
    throw new Error(error.message);
  }
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => ({
    session_date: String((row as { session_date: string }).session_date).slice(0, 10),
    venue: "NYSE",
    session_kind: (row as { session_kind: "regular" | "half" }).session_kind,
    open_minute: Number((row as { open_minute: number }).open_minute),
    close_minute: Number((row as { close_minute: number }).close_minute),
  }));
}

async function loadContext(
  client: UserClient,
  userId: string,
  draft: OrderDraft,
): Promise<LoadedCtx> {
  const { data: accounts, error: accountErr } = await client.database
    .from("accounts")
    .select("*")
    .eq("user_id", userId);
  if (accountErr) {
    throw new Error(accountErr.message);
  }
  const account = Array.isArray(accounts) ? accounts[0] : null;
  if (!account) {
    throw new Error("ACCOUNT_UNAVAILABLE");
  }

  const { data: profiles, error: profileErr } = await client.database
    .from("profiles")
    .select("*")
    .eq("user_id", userId);
  if (profileErr) {
    throw new Error(profileErr.message);
  }
  const profile = Array.isArray(profiles) ? profiles[0] : null;

  const { data: instruments, error: instErr } = await client.database
    .from("instruments")
    .select("*")
    .eq("symbol", draft.symbol);
  if (instErr) {
    throw new Error(instErr.message);
  }
  const instrument = Array.isArray(instruments) ? instruments[0] : null;
  if (!instrument) {
    throw new Error("INSTRUMENT_NOT_FOUND");
  }
  const typedInstrument = instrument as LoadedCtx["instrument"];

  const { data: quotes, error: quoteErr } = await client.database
    .from("quotes_latest")
    .select("last")
    .eq("instrument_id", typedInstrument.id);
  if (quoteErr) {
    throw new Error(quoteErr.message);
  }
  const quote = Array.isArray(quotes) ? quotes[0] : null;
  const quoteLast =
    quote && typeof quote === "object" && quote !== null && "last" in quote
      ? (quote as { last: unknown }).last
      : undefined;

  const { data: positions, error: posErr } = await client.database
    .from("positions")
    .select("qty")
    .eq("account_id", (account as { id: string }).id)
    .eq("instrument_id", typedInstrument.id);
  if (posErr) {
    throw new Error(posErr.message);
  }
  const position = Array.isArray(positions) ? positions[0] : null;
  const positionQty = position ? Number((position as { qty: string | number }).qty) : 0;

  const now = new Date();
  const dateKey = nyClockParts(now).dateKey;
  const { data: todayOrders, error: todayErr } = await client.database
    .from("orders")
    .select("id,created_at")
    .eq("user_id", userId);
  if (todayErr) {
    throw new Error(todayErr.message);
  }
  const ordersToday = (Array.isArray(todayOrders) ? todayOrders : []).filter((row) => {
    const created = String((row as { created_at: string }).created_at);
    return nyClockParts(new Date(created)).dateKey === dateKey;
  }).length;

  const calendar = await loadCalendar(client);
  const nyse = nyseSessionState(now, calendar.length > 0 ? calendar : undefined);
  const session: "open" | "closed" = nyse === "OPEN" ? "open" : "closed";

  return {
    account: account as LoadedCtx["account"],
    profile: profile as { experience_level: string | null } | null,
    instrument: typedInstrument,
    lastPrice: lastPriceForRuleFacts({ quoteLast }),
    positionQty,
    ordersToday,
    session,
  };
}

async function evaluateOrderDomains(input: {
  client: UserClient;
  userId: string;
  accessToken: string;
  baseUrl: string;
  draft: OrderDraft;
  sequential: boolean;
}): Promise<{
  preview: OrderPreviewResponse;
  ctx: LoadedCtx;
  validation: EvaluateDomainResponse;
  risk: EvaluateDomainResponse;
  hours: EvaluateDomainResponse;
}> {
  const ctx = await loadContext(input.client, input.userId, input.draft);
  const buyingPower = buyingPowerOf(ctx.account);
  const facts = buildOrderFacts({
    draft: input.draft,
    lastPrice: ctx.lastPrice,
    buyingPower,
    positionQty: ctx.positionQty,
    equity: buyingPower,
    experienceLevel: ctx.profile?.experience_level ?? null,
    instrumentStatus: ctx.instrument.status,
    tickSize: Number(ctx.instrument.tick_size),
    instrumentBetaClass: ctx.instrument.beta_class,
    ordersToday: ctx.ordersToday,
    accountTier: null,
    session: ctx.session,
  });
  const call = (domain: "order_validation" | "pre_trade_risk" | "market_hours" | "fees") =>
    evaluateRemote({
      baseUrl: input.baseUrl,
      accessToken: input.accessToken,
      domain,
      context: facts,
    });
  let validation: EvaluateDomainResponse;
  let risk: EvaluateDomainResponse;
  let hours: EvaluateDomainResponse;
  let fees: EvaluateDomainResponse;
  if (input.sequential) {
    validation = await call("order_validation");
    risk = await call("pre_trade_risk");
    hours = await call("market_hours");
    fees = await call("fees");
  } else {
    [validation, risk, fees, hours] = await Promise.all([
      call("order_validation"),
      call("pre_trade_risk"),
      call("fees"),
      call("market_hours"),
    ]);
  }
  const preview = assemblePreview({
    draft: input.draft,
    lastPrice: ctx.lastPrice,
    buyingPower,
    facts,
    validationOutcome: validation.outcome,
    riskOutcome: risk.outcome,
    feeOutcome: asRecord(fees.outcome),
    hoursOutcome: hours.outcome,
  });
  return { preview, ctx, validation, risk, hours };
}

function rpcOk(data: unknown): boolean {
  if (data && typeof data === "object" && "ok" in data) {
    return (data as { ok: unknown }).ok === true;
  }
  return false;
}

async function insertOrderRow(admin: AdminClient, row: OrderRecord): Promise<void> {
  const insert = await admin.database.from("orders").insert([
    {
      id: row.id,
      user_id: row.user_id,
      account_id: row.account_id,
      instrument_id: row.instrument_id,
      symbol: row.symbol,
      side: row.side,
      qty: row.qty,
      filled_qty: row.filled_qty,
      order_type: row.order_type,
      limit_price: row.limit_price,
      stop_price: row.stop_price,
      tif: row.tif,
      status: row.status,
      reject_reason: row.reject_reason,
      rule_audit_id: row.rule_audit_id,
      parent_order_id: row.parent_order_id ?? null,
      group_id: row.group_id ?? null,
      group_type: row.group_type ?? null,
      leg_role: row.leg_role ?? null,
      group_activated: row.group_activated ?? true,
      trail_type: row.trail_type ?? null,
      trail_value: row.trail_value ?? null,
      high_water_mark: row.high_water_mark ?? null,
      reserved_amount: row.reserved_amount,
    },
  ]);
  if (insert.error) {
    throw new Error(insert.error.message);
  }
}

async function reserveBuyingPower(
  admin: AdminClient,
  accountId: string,
  userId: string,
  amount: number,
): Promise<unknown> {
  const { data, error } = await admin.database.rpc("reserve_buying_power", {
    p_account_id: accountId,
    p_amount: amount,
    p_user_id: userId,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function releaseBuyingPower(
  admin: AdminClient,
  accountId: string,
  userId: string,
  amount: number,
): Promise<void> {
  const { error } = await admin.database.rpc("release_buying_power", {
    p_account_id: accountId,
    p_amount: amount,
    p_user_id: userId,
  });
  if (error) {
    throw new Error(error.message);
  }
}

async function publishOrder(admin: AdminClient, userId: string, order: OrderRecord): Promise<void> {
  const { error } = await admin.database.rpc("publish_order_event", {
    p_user_id: userId,
    payload: {
      id: order.id,
      status: order.status,
      symbol: order.symbol,
      reject_reason: order.reject_reason,
      rule_audit_id: order.rule_audit_id,
    },
  });
  if (error) {
    throw new Error(error.message);
  }
}

function requireAdminWriter(baseUrl: string) {
  const apiKey = resolveRulesServiceApiKey({
    API_KEY: Deno.env.get("API_KEY"),
    INSFORGE_API_KEY: Deno.env.get("INSFORGE_API_KEY"),
  });
  if (!apiKey) {
    return null;
  }
  return createAdminClient({
    baseUrl,
    apiKey,
  });
}

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  const authHeader = req.headers.get("Authorization");
  const userToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!userToken) {
    return json(401, { error: "UNAUTHENTICATED" });
  }

  const baseUrl = Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL");
  if (!baseUrl) {
    return json(500, { error: "INSFORGE_URL_MISSING" });
  }

  const client = createClient({
    baseUrl,
    accessToken: userToken,
  });
  const { data: userData } = await client.auth.getCurrentUser();
  const userId = userData?.user?.id as string | undefined;
  if (!userId) {
    return json(401, { error: "UNAUTHENTICATED" });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const fromPath = pathOp(req);
  const opRaw =
    body && typeof body === "object" && "op" in body ? (body as { op?: unknown }).op : fromPath?.op;
  const op: Op | undefined =
    opRaw === "preview" || opRaw === "create" || opRaw === "cancel" ? opRaw : fromPath?.op;
  if (!op) {
    return json(400, { error: "UNKNOWN_OP" });
  }

  const action =
    op === "preview" ? "trade:preview" : op === "create" ? "trade:create" : "trade:cancel";
  const gate = authorize({ userId, action });
  if (!gate.allowed) {
    return json(403, { error: gate.reason ?? "DENIED" });
  }

  try {
    if (op === "preview") {
      const parsed = orderPreviewRequestSchema.parse({
        ...(body as object),
        op: "preview",
      });
      void parsed.last_price;
      const { preview } = await evaluateOrderDomains({
        client,
        userId,
        accessToken: userToken,
        baseUrl,
        draft: parsed.draft,
        sequential: false,
      });
      return json(200, preview);
    }

    if (op === "cancel") {
      const parsed = orderCancelRequestSchema.parse({
        ...(typeof body === "object" && body ? body : {}),
        op: "cancel",
      });
      const orderId = uuidSchema.parse(parsed.order_id ?? fromPath?.orderId);
      const { data: rows, error: loadErr } = await client.database
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("user_id", userId);
      if (loadErr) {
        throw new Error(loadErr.message);
      }
      const existing = Array.isArray(rows) ? rows[0] : null;
      if (!existing) {
        return json(404, { error: "ORDER_NOT_FOUND" });
      }
      const current = orderRecordSchema.parse(hydrateOrderRow(existing));
      if (!canCancel(current.status as OrderStatus)) {
        return json(409, { error: `FSM_ILLEGAL:${current.status}->cancelled` });
      }
      const admin = requireAdminWriter(baseUrl);
      if (!admin) {
        return json(500, { error: "SERVICE_KEY_UNAVAILABLE" });
      }
      const held = current.reserved_amount ?? 0;
      if (held > 0) {
        await releaseBuyingPower(admin, current.account_id, userId, held);
      }
      const updatedAt = new Date().toISOString();
      const update = await admin.database
        .from("orders")
        .update({
          status: "cancelled",
          reserved_amount: 0,
        })
        .eq("id", current.id)
        .eq("user_id", userId);
      if (update.error) {
        throw new Error(update.error.message);
      }
      const cancelled: OrderRecord = {
        ...current,
        status: "cancelled",
        reserved_amount: 0,
        updated_at: updatedAt,
      };
      await client.database.from("audit_log").insert([
        {
          user_id: userId,
          action: "trade:cancel",
          entity_type: "orders",
          entity_id: cancelled.id,
          payload: { from: current.status, to: "cancelled" },
        },
      ]);
      await publishOrder(admin, userId, cancelled);
      return json(200, { order: cancelled });
    }

    const parsed = orderCreateRequestSchema.parse({
      ...(body as object),
      op: "create",
    });
    const draft = orderDraftSchema.parse(parsed.draft);
    void parsed.last_price;
    const { preview, ctx, validation, risk, hours } = await evaluateOrderDomains({
      client,
      userId,
      accessToken: userToken,
      baseUrl,
      draft,
      sequential: true,
    });
    const admin = requireAdminWriter(baseUrl);
    if (!admin) {
      return json(500, { error: "SERVICE_KEY_UNAVAILABLE" });
    }
    const placement = await placeWithReserve({
      validation: { outcome: validation.outcome, auditId: validation.auditId },
      risk: { outcome: risk.outcome, auditId: risk.auditId },
      hours: { outcome: hours.outcome, auditId: hours.auditId },
      reserveAmount: reserveAmountForSide({
        side: draft.side,
        orderNotional: preview.order_notional,
        estimatedFees: preview.estimated_fees,
      }),
      reserve: async (amount) => {
        const data = await reserveBuyingPower(admin, ctx.account.id, userId, amount);
        return { ok: rpcOk(data) };
      },
    });
    const now = new Date().toISOString();
    const legs = expandOrderGroup(draft);
    const groupId = legs.length > 1 ? crypto.randomUUID() : null;
    const parentId = crypto.randomUUID();
    const created: OrderRecord[] = [];
    try {
      for (const [index, leg] of legs.entries()) {
        const id = index === 0 ? parentId : crypto.randomUUID();
        const trailSeed = seedTrailingOnCreate(
          {
            side: leg.draft.side,
            trail_type: leg.trail_type,
            trail_value: leg.trail_value,
            high_water_mark: null,
            stop_price: leg.draft.stop_price ?? null,
          },
          ctx.lastPrice,
        );
        const isParent = index === 0;
        const row = orderRecordSchema.parse({
          id,
          user_id: userId,
          account_id: ctx.account.id,
          instrument_id: ctx.instrument.id,
          symbol: leg.draft.symbol,
          side: leg.draft.side,
          qty: leg.draft.qty,
          filled_qty: 0,
          order_type: leg.draft.order_type,
          limit_price: leg.draft.limit_price ?? null,
          stop_price: trailSeed.stop_price,
          tif: leg.draft.tif,
          status: placement.status,
          reject_reason: isParent
            ? placement.rejectReason
            : placement.status === "rejected"
              ? placement.rejectReason
              : null,
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
        });
        await insertOrderRow(admin, row);
        created.push(row);
      }
    } catch (error) {
      if (placement.reserved > 0) {
        await releaseBuyingPower(admin, ctx.account.id, userId, placement.reserved);
      }
      throw error;
    }
    const parsedRow = created[0];
    if (!parsedRow) {
      throw new Error("ORDER_CREATE_EMPTY");
    }
    await client.database.from("audit_log").insert([
      {
        user_id: userId,
        action: "trade:create",
        entity_type: "orders",
        entity_id: parsedRow.id,
        payload: {
          status: parsedRow.status,
          symbol: draft.symbol,
          reject_reason: parsedRow.reject_reason,
          rule_audit_id: parsedRow.rule_audit_id,
          group_id: groupId,
          legs: created.length,
        },
      },
    ]);
    for (const row of created) {
      await publishOrder(admin, userId, row);
    }
    return json(placement.status === "accepted" ? 200 : 422, { order: parsedRow, preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ORDER_SERVICE_ERROR";
    return json(400, { error: message });
  }
}
