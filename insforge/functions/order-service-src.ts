/**
 * Orchestration source for `order-service`. Deno deploy is a single file:
 * bundle to `order-service.ts` with esbuild (`--external:npm:@insforge/sdk`).
 */
import { createClient } from "npm:@insforge/sdk";
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
  placeWithReserve,
  reserveAmountForSide,
} from "../../packages/paper-engine/src/index.ts";
import { authorize } from "../../packages/rules-engine/src/index.ts";

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

type LoadedCtx = {
  account: { id: string; cash_balance: string | number; reserved_cash?: string | number };
  profile: { experience_level: string | null } | null;
  instrument: {
    id: string;
    status: string;
    tick_size: string | number;
    beta_class: string | null;
  };
  positionQty: number;
  ordersToday: number;
  session: "open" | "closed";
};

function buyingPowerOf(account: LoadedCtx["account"]): number {
  return Number(account.cash_balance) - Number(account.reserved_cash ?? 0);
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

  const { data: positions, error: posErr } = await client.database
    .from("positions")
    .select("qty")
    .eq("account_id", (account as { id: string }).id)
    .eq("instrument_id", (instrument as { id: string }).id);
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
    instrument: instrument as LoadedCtx["instrument"],
    positionQty,
    ordersToday,
    session,
  };
}

async function runPreview(input: {
  client: UserClient;
  userId: string;
  accessToken: string;
  baseUrl: string;
  draft: OrderDraft;
  lastPrice: number;
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
    lastPrice: input.lastPrice,
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
  const [validation, risk, fees, hours] = await Promise.all([
    evaluateRemote({
      baseUrl: input.baseUrl,
      accessToken: input.accessToken,
      domain: "order_validation",
      context: facts,
    }),
    evaluateRemote({
      baseUrl: input.baseUrl,
      accessToken: input.accessToken,
      domain: "pre_trade_risk",
      context: facts,
    }),
    evaluateRemote({
      baseUrl: input.baseUrl,
      accessToken: input.accessToken,
      domain: "fees",
      context: facts,
    }),
    evaluateRemote({
      baseUrl: input.baseUrl,
      accessToken: input.accessToken,
      domain: "market_hours",
      context: facts,
    }),
  ]);
  const preview = assemblePreview({
    draft: input.draft,
    lastPrice: input.lastPrice,
    buyingPower,
    facts,
    validationOutcome: validation.outcome,
    riskOutcome: risk.outcome,
    feeOutcome: asRecord(fees.outcome),
    hoursOutcome: hours.outcome,
  });
  return { preview, ctx, validation, risk, hours };
}

async function runCreateEvals(input: {
  client: UserClient;
  userId: string;
  accessToken: string;
  baseUrl: string;
  draft: OrderDraft;
  lastPrice: number;
}): Promise<{
  preview: OrderPreviewResponse;
  ctx: LoadedCtx;
  validation: EvaluateDomainResponse;
  risk: EvaluateDomainResponse;
  hours: EvaluateDomainResponse;
  facts: ReturnType<typeof buildOrderFacts>;
}> {
  const ctx = await loadContext(input.client, input.userId, input.draft);
  const buyingPower = buyingPowerOf(ctx.account);
  const facts = buildOrderFacts({
    draft: input.draft,
    lastPrice: input.lastPrice,
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
  const validation = await evaluateRemote({
    baseUrl: input.baseUrl,
    accessToken: input.accessToken,
    domain: "order_validation",
    context: facts,
  });
  const risk = await evaluateRemote({
    baseUrl: input.baseUrl,
    accessToken: input.accessToken,
    domain: "pre_trade_risk",
    context: facts,
  });
  const hours = await evaluateRemote({
    baseUrl: input.baseUrl,
    accessToken: input.accessToken,
    domain: "market_hours",
    context: facts,
  });
  const fees = await evaluateRemote({
    baseUrl: input.baseUrl,
    accessToken: input.accessToken,
    domain: "fees",
    context: facts,
  });
  const preview = assemblePreview({
    draft: input.draft,
    lastPrice: input.lastPrice,
    buyingPower,
    facts,
    validationOutcome: validation.outcome,
    riskOutcome: risk.outcome,
    feeOutcome: asRecord(fees.outcome),
    hoursOutcome: hours.outcome,
  });
  return { preview, ctx, validation, risk, hours, facts };
}

function rpcOk(data: unknown): boolean {
  if (data && typeof data === "object" && "ok" in data) {
    return (data as { ok: unknown }).ok === true;
  }
  return false;
}

async function insertOrderRow(client: UserClient, row: OrderRecord): Promise<void> {
  const insert = await client.database.from("orders").insert([
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
      reserved_amount: row.reserved_amount,
    },
  ]);
  if (insert.error) {
    throw new Error(insert.error.message);
  }
}

async function publishOrder(client: UserClient, userId: string, order: OrderRecord): Promise<void> {
  const { error } = await client.database.rpc("publish_order_event", {
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
      const { preview } = await runPreview({
        client,
        userId,
        accessToken: userToken,
        baseUrl,
        draft: parsed.draft,
        lastPrice: parsed.last_price,
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
      const current = orderRecordSchema.parse({
        ...existing,
        parent_order_id: (existing as { parent_order_id?: string | null }).parent_order_id ?? null,
        reserved_amount: (existing as { reserved_amount?: number }).reserved_amount ?? 0,
      });
      if (!canCancel(current.status as OrderStatus)) {
        return json(409, { error: `FSM_ILLEGAL:${current.status}->cancelled` });
      }
      const held = current.reserved_amount ?? 0;
      if (held > 0) {
        const released = await client.database.rpc("release_buying_power", {
          p_account_id: current.account_id,
          p_amount: held,
        });
        if (released.error) {
          throw new Error(released.error.message);
        }
      }
      const updatedAt = new Date().toISOString();
      const update = await client.database
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
      await publishOrder(client, userId, cancelled);
      return json(200, { order: cancelled });
    }

    const parsed = orderCreateRequestSchema.parse({
      ...(body as object),
      op: "create",
    });
    const draft = orderDraftSchema.parse(parsed.draft);
    const { preview, ctx, validation, risk, hours } = await runCreateEvals({
      client,
      userId,
      accessToken: userToken,
      baseUrl,
      draft,
      lastPrice: parsed.last_price,
    });
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
        const { data, error } = await client.database.rpc("reserve_buying_power", {
          p_account_id: ctx.account.id,
          p_amount: amount,
        });
        if (error) {
          throw new Error(error.message);
        }
        return { ok: rpcOk(data) };
      },
    });
    const now = new Date().toISOString();
    const row: OrderRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      account_id: ctx.account.id,
      instrument_id: ctx.instrument.id,
      symbol: draft.symbol,
      side: draft.side,
      qty: draft.qty,
      filled_qty: 0,
      order_type: draft.order_type,
      limit_price: draft.limit_price ?? null,
      stop_price: draft.stop_price ?? null,
      tif: draft.tif,
      status: placement.status,
      reject_reason: placement.rejectReason,
      rule_audit_id: placement.ruleAuditId,
      parent_order_id: null,
      reserved_amount: placement.reserved,
      created_at: now,
      updated_at: now,
    };
    const parsedRow = orderRecordSchema.parse(row);
    try {
      await insertOrderRow(client, parsedRow);
    } catch (error) {
      if (placement.reserved > 0) {
        await client.database.rpc("release_buying_power", {
          p_account_id: ctx.account.id,
          p_amount: placement.reserved,
        });
      }
      throw error;
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
        },
      },
    ]);
    await publishOrder(client, userId, parsedRow);
    return json(placement.status === "accepted" ? 200 : 422, { order: parsedRow, preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ORDER_SERVICE_ERROR";
    return json(400, { error: message });
  }
}
