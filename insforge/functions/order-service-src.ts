/**
 * Orchestration source for `order-service`. Deno deploy is a single file:
 * bundle to `order-service.ts` with esbuild (`--external:npm:@insforge/sdk`).
 */
import { createAdminClient, createClient } from "npm:@insforge/sdk";
import {
  evaluateDomainResponseSchema,
  orderCreateRequestSchema,
  orderDraftSchema,
  orderPreviewRequestSchema,
  orderRecordSchema,
  type EvaluateDomainResponse,
  type OrderDraft,
  type OrderPreviewResponse,
  type OrderRecord,
} from "../../packages/schemas/src/index.ts";
import {
  assemblePreview,
  buildOrderFacts,
  lastPriceForRuleFacts,
} from "../../packages/paper-engine/src/index.ts";
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

function pathOp(req: Request): "preview" | "create" | null {
  const pathname = new URL(req.url).pathname.replace(/\/+$/, "");
  if (pathname.endsWith("/preview")) {
    return "preview";
  }
  if (pathname.endsWith("/orders")) {
    return "create";
  }
  return null;
}

async function evaluateRemote(input: {
  baseUrl: string;
  accessToken: string;
  domain: "order_validation" | "pre_trade_risk" | "fees";
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

async function loadContext(client: UserClient, userId: string, draft: OrderDraft) {
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
  const typedInstrument = instrument as {
    id: string;
    status: string;
    tick_size: string | number;
    beta_class: string | null;
  };

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

  return {
    account: account as { id: string; cash_balance: string | number },
    profile: profile as { experience_level: string | null } | null,
    instrument: typedInstrument,
    lastPrice: lastPriceForRuleFacts({ quoteLast }),
  };
}

async function runPreview(input: {
  client: UserClient;
  userId: string;
  accessToken: string;
  baseUrl: string;
  draft: OrderDraft;
}): Promise<OrderPreviewResponse> {
  const ctx = await loadContext(input.client, input.userId, input.draft);
  const buyingPower = Number(ctx.account.cash_balance);
  const facts = buildOrderFacts({
    draft: input.draft,
    lastPrice: ctx.lastPrice,
    buyingPower,
    positionQty: 0,
    equity: buyingPower,
    experienceLevel: ctx.profile?.experience_level ?? null,
    instrumentStatus: ctx.instrument.status,
    tickSize: Number(ctx.instrument.tick_size),
    instrumentBetaClass: ctx.instrument.beta_class,
    ordersToday: 0,
    accountTier: null,
  });
  const [validation, risk, fees] = await Promise.all([
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
  ]);
  return assemblePreview({
    draft: input.draft,
    lastPrice: ctx.lastPrice,
    buyingPower,
    facts,
    validationOutcome: validation.outcome,
    riskOutcome: risk.outcome,
    feeOutcome: asRecord(fees.outcome),
  });
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
    body && typeof body === "object" && "op" in body ? (body as { op?: unknown }).op : fromPath;
  const op = opRaw === "preview" || opRaw === "create" ? opRaw : fromPath;
  if (op !== "preview" && op !== "create") {
    return json(400, { error: "UNKNOWN_OP" });
  }

  const action = op === "preview" ? "trade:preview" : "trade:create";
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
      const preview = await runPreview({
        client,
        userId,
        accessToken: userToken,
        baseUrl,
        draft: parsed.draft,
      });
      await client.database.from("audit_log").insert([
        {
          user_id: userId,
          action: "trade:preview",
          entity_type: "orders",
          payload: { symbol: parsed.draft.symbol, passed: preview.passed },
        },
      ]);
      return json(200, preview);
    }

    const parsed = orderCreateRequestSchema.parse({
      ...(body as object),
      op: "create",
    });
    const draft = orderDraftSchema.parse(parsed.draft);
    void parsed.last_price;
    const preview = await runPreview({
      client,
      userId,
      accessToken: userToken,
      baseUrl,
      draft,
    });
    const ctx = await loadContext(client, userId, draft);
    const now = new Date().toISOString();
    const status = preview.passed ? "accepted" : "rejected";
    const rejectReason =
      preview.rules.find((row) => !row.passed)?.reason ?? (preview.passed ? null : "rejected");
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
      status,
      reject_reason: rejectReason,
      rule_audit_id: null,
      parent_order_id: null,
      created_at: now,
      updated_at: now,
    };
    const parsedRow = orderRecordSchema.parse(row);
    if (preview.passed) {
      const admin = requireAdminWriter(baseUrl);
      if (!admin) {
        return json(500, { error: "SERVICE_KEY_UNAVAILABLE" });
      }
      const insert = await admin.database.from("orders").insert([
        {
          id: parsedRow.id,
          user_id: parsedRow.user_id,
          account_id: parsedRow.account_id,
          instrument_id: parsedRow.instrument_id,
          symbol: parsedRow.symbol,
          side: parsedRow.side,
          qty: parsedRow.qty,
          filled_qty: parsedRow.filled_qty,
          order_type: parsedRow.order_type,
          limit_price: parsedRow.limit_price,
          stop_price: parsedRow.stop_price,
          tif: parsedRow.tif,
          status: parsedRow.status,
          reject_reason: parsedRow.reject_reason,
          rule_audit_id: parsedRow.rule_audit_id,
          parent_order_id: parsedRow.parent_order_id,
        },
      ]);
      if (insert.error) {
        return json(500, { error: insert.error.message });
      }
    }
    await client.database.from("audit_log").insert([
      {
        user_id: userId,
        action: "trade:create",
        entity_type: "orders",
        entity_id: parsedRow.id,
        payload: { status: parsedRow.status, symbol: draft.symbol },
      },
    ]);
    return json(preview.passed ? 200 : 422, { order: parsedRow, preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ORDER_SERVICE_ERROR";
    return json(400, { error: message });
  }
}
