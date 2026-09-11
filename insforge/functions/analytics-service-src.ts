/**
 * Orchestration source for `analytics-service`. Deno deploy is a single file:
 * bundle to `analytics-service.ts` with esbuild (`--external:npm:@insforge/sdk`).
 */
import { createAdminClient, createClient } from "npm:@insforge/sdk";
import { rsi14Last } from "../../packages/indicators/src/index.ts";
import {
  nyClockParts,
  nyseSessionState,
  type MarketCalendarRow,
} from "../../packages/mock-data/src/index.ts";
import {
  analyticsPortfolioRequestSchema,
  analyticsRsiRequestSchema,
  analyticsRsiResponseSchema,
  analyticsSnapshotRequestSchema,
  analyticsSnapshotResponseSchema,
  assemblePortfolio,
  dailySnapshotDate,
  filterEquityCurve,
  portfolioResponseSchema,
  type EquityCurveRange,
  type MarkedPositionInput,
} from "../../packages/schemas/src/index.ts";
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

type Op = "portfolio" | "snapshot" | "rsi";

function pathOp(req: Request): Op | null {
  const pathname = new URL(req.url).pathname.replace(/\/+$/, "");
  if (pathname.endsWith("/portfolio")) {
    return "portfolio";
  }
  if (pathname.endsWith("/snapshot")) {
    return "snapshot";
  }
  if (pathname.endsWith("/rsi")) {
    return "rsi";
  }
  return null;
}

function asRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

type DbClient = ReturnType<typeof createAdminClient> | ReturnType<typeof createClient>;

async function loadCalendar(client: DbClient): Promise<MarketCalendarRow[]> {
  const { data, error } = await client.database
    .from("market_calendar")
    .select("session_date,venue,session_kind,open_minute,close_minute");
  if (error) {
    throw new Error(error.message);
  }
  return asRows<Record<string, unknown>>(data).map((row) => ({
    session_date: String(row.session_date).slice(0, 10),
    venue: "NYSE",
    session_kind: (row.session_kind as "regular" | "half") ?? "regular",
    open_minute: num(row.open_minute),
    close_minute: num(row.close_minute),
  }));
}

async function precomputeDailyRsi(admin: DbClient): Promise<number> {
  const barsRes = await admin.database
    .from("market_bars")
    .select("instrument_id,ts,c")
    .eq("timeframe", "1d");
  if (barsRes.error) {
    throw new Error(barsRes.error.message);
  }
  const byInstrument = new Map<string, Array<{ ts: string; c: number }>>();
  for (const row of asRows<Record<string, unknown>>(barsRes.data)) {
    const id = String(row.instrument_id);
    const list = byInstrument.get(id) ?? [];
    list.push({ ts: String(row.ts), c: num(row.c) });
    byInstrument.set(id, list);
  }
  const upserts: Array<{
    instrument_id: string;
    rsi_14: number | null;
    as_of_date: string;
  }> = [];
  for (const [instrumentId, bars] of byInstrument) {
    bars.sort((a, b) => a.ts.localeCompare(b.ts));
    const closes = bars.map((bar) => bar.c);
    const lastBar = bars[bars.length - 1];
    if (!lastBar) {
      continue;
    }
    upserts.push({
      instrument_id: instrumentId,
      rsi_14: rsi14Last(closes),
      as_of_date: lastBar.ts.slice(0, 10),
    });
  }
  if (upserts.length > 0) {
    const { error } = await admin.database
      .from("instrument_daily_rsi")
      .upsert(upserts, { onConflict: "instrument_id" });
    if (error) {
      throw new Error(error.message);
    }
  }
  return upserts.length;
}

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return json(401, { error: "UNAUTHENTICATED" });
  }

  const baseUrl = Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL");
  if (!baseUrl) {
    return json(500, { error: "INSFORGE_URL_MISSING" });
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
  const op: Op | undefined =
    opRaw === "portfolio" || opRaw === "snapshot" || opRaw === "rsi"
      ? opRaw
      : (fromPath ?? undefined);
  if (!op) {
    return json(400, { error: "UNKNOWN_OP" });
  }

  if (op === "rsi") {
    const expected = resolveRulesServiceApiKey({
      API_KEY: Deno.env.get("API_KEY"),
      INSFORGE_API_KEY: Deno.env.get("INSFORGE_API_KEY"),
    });
    if (!expected || token !== expected) {
      return json(401, { error: "UNAUTHENTICATED" });
    }
    const parsed = analyticsRsiRequestSchema.safeParse({
      ...(body && typeof body === "object" ? body : {}),
      op: "rsi",
    });
    if (!parsed.success) {
      return json(400, { error: "INVALID_BODY" });
    }
    const admin = createAdminClient({ baseUrl, apiKey: expected });
    try {
      const written = await precomputeDailyRsi(admin);
      await admin.database.from("audit_log").insert([
        {
          user_id: null,
          action: "analytics:rsi",
          entity_type: "instrument_daily_rsi",
          payload: { written },
        },
      ]);
      return json(200, analyticsRsiResponseSchema.parse({ written }));
    } catch (error) {
      return json(500, { error: error instanceof Error ? error.message : "RSI_FAILED" });
    }
  }

  if (op === "snapshot") {
    const expected = resolveRulesServiceApiKey({
      API_KEY: Deno.env.get("API_KEY"),
      INSFORGE_API_KEY: Deno.env.get("INSFORGE_API_KEY"),
    });
    if (!expected || token !== expected) {
      return json(401, { error: "UNAUTHENTICATED" });
    }
    const parsed = analyticsSnapshotRequestSchema.safeParse({
      ...(body && typeof body === "object" ? body : {}),
      op: "snapshot",
    });
    if (!parsed.success) {
      return json(400, { error: "INVALID_BODY" });
    }
    const admin = createAdminClient({ baseUrl, apiKey: expected });
    const now = new Date();
    const parts = nyClockParts(now);
    const calendar = await loadCalendar(admin);
    const session = nyseSessionState(now, calendar);
    const todayRow = calendar.find((row) => row.session_date === parts.dateKey) ?? null;
    const asOf =
      parsed.data.as_of_date ??
      dailySnapshotDate({
        sessionDate: todayRow?.session_date ?? null,
        session,
        minutes: parts.hour * 60 + parts.minute,
        closeMinute: todayRow?.close_minute ?? null,
        force: parsed.data.force,
      });
    if (!asOf) {
      return json(
        200,
        analyticsSnapshotResponseSchema.parse({ written: 0, skipped: true, as_of_date: null }),
      );
    }

    const [accountsRes, positionsRes, quotesRes, instrumentsRes, existingRes] = await Promise.all([
      admin.database.from("accounts").select("id,user_id,cash_balance,reserved_cash,currency"),
      admin.database
        .from("positions")
        .select("id,user_id,account_id,instrument_id,symbol,qty,avg_cost,realized_pnl"),
      admin.database.from("quotes_latest").select("instrument_id,last,prev_close"),
      admin.database.from("instruments").select("id,sector"),
      admin.database.from("portfolio_snapshots").select("account_id").eq("as_of_date", asOf),
    ]);
    for (const res of [accountsRes, positionsRes, quotesRes, instrumentsRes, existingRes]) {
      if (res.error) {
        return json(500, { error: res.error.message });
      }
    }
    const quotes = new Map<string, { last: number; prev_close: number }>();
    for (const row of asRows<Record<string, unknown>>(quotesRes.data)) {
      quotes.set(String(row.instrument_id), {
        last: num(row.last),
        prev_close: num(row.prev_close),
      });
    }
    const sectors = new Map<string, string | null>();
    for (const row of asRows<Record<string, unknown>>(instrumentsRes.data)) {
      sectors.set(String(row.id), row.sector == null ? null : String(row.sector));
    }
    const already = new Set(
      asRows<Record<string, unknown>>(existingRes.data).map((row) => String(row.account_id)),
    );
    const positionsByAccount = new Map<string, MarkedPositionInput[]>();
    for (const row of asRows<Record<string, unknown>>(positionsRes.data)) {
      const accountId = String(row.account_id);
      const instrumentId = String(row.instrument_id);
      const quote = quotes.get(instrumentId);
      const list = positionsByAccount.get(accountId) ?? [];
      list.push({
        id: String(row.id),
        instrument_id: instrumentId,
        symbol: String(row.symbol),
        sector: sectors.get(instrumentId) ?? null,
        qty: num(row.qty),
        avg_cost: num(row.avg_cost),
        realized_pnl: num(row.realized_pnl),
        last: quote?.last ?? 0,
        prev_close: quote?.prev_close ?? 0,
      });
      positionsByAccount.set(accountId, list);
    }

    let written = 0;
    for (const account of asRows<Record<string, unknown>>(accountsRes.data)) {
      const accountId = String(account.id);
      if (already.has(accountId)) {
        continue;
      }
      const marked = assemblePortfolio({
        account: {
          id: accountId,
          cash: num(account.cash_balance),
          reserved_cash: num(account.reserved_cash),
          currency: String(account.currency ?? "USD"),
        },
        positions: positionsByAccount.get(accountId) ?? [],
      });
      const insert = await admin.database.from("portfolio_snapshots").insert([
        {
          user_id: String(account.user_id),
          account_id: accountId,
          as_of_date: asOf,
          equity: marked.account.equity,
          cash: marked.account.cash,
          buying_power: marked.account.buying_power,
        },
      ]);
      if (insert.error) {
        return json(500, { error: insert.error.message });
      }
      written += 1;
    }

    await admin.database.from("audit_log").insert([
      {
        user_id: asRows<Record<string, unknown>>(accountsRes.data)[0]
          ? String(asRows<Record<string, unknown>>(accountsRes.data)[0]?.user_id)
          : null,
        action: "portfolio:snapshot",
        entity_type: "portfolio_snapshots",
        payload: { written, as_of_date: asOf, ts: now.toISOString() },
      },
    ]);
    try {
      await precomputeDailyRsi(admin);
    } catch {
      // Snapshot already persisted; RSI refresh is best-effort on the close job.
    }
    return json(
      200,
      analyticsSnapshotResponseSchema.parse({ written, skipped: written === 0, as_of_date: asOf }),
    );
  }

  const client = createClient({
    baseUrl,
    accessToken: token,
  });
  const { data: userData } = await client.auth.getCurrentUser();
  const userId = userData?.user?.id as string | undefined;
  const gate = authorize({ userId, action: "portfolio:read" });
  if (!gate.allowed || !userId) {
    return json(401, { error: gate.reason ?? "UNAUTHENTICATED" });
  }

  const parsed = analyticsPortfolioRequestSchema.safeParse({
    ...(body && typeof body === "object" ? body : {}),
    op: "portfolio",
  });
  if (!parsed.success) {
    return json(400, { error: "INVALID_BODY" });
  }

  const [accountsRes, positionsRes, quotesRes, instrumentsRes, snapshotsRes] = await Promise.all([
    client.database.from("accounts").select("id,user_id,cash_balance,reserved_cash,currency"),
    client.database
      .from("positions")
      .select("id,user_id,account_id,instrument_id,symbol,qty,avg_cost,realized_pnl"),
    client.database.from("quotes_latest").select("instrument_id,last,prev_close"),
    client.database.from("instruments").select("id,sector"),
    client.database
      .from("portfolio_snapshots")
      .select("id,user_id,account_id,as_of_date,equity,cash,buying_power,created_at"),
  ]);
  for (const res of [accountsRes, positionsRes, quotesRes, instrumentsRes, snapshotsRes]) {
    if (res.error) {
      return json(500, { error: res.error.message });
    }
  }
  const account = asRows<Record<string, unknown>>(accountsRes.data)[0];
  if (!account) {
    return json(404, { error: "ACCOUNT_MISSING" });
  }
  const quotes = new Map<string, { last: number; prev_close: number }>();
  for (const row of asRows<Record<string, unknown>>(quotesRes.data)) {
    quotes.set(String(row.instrument_id), { last: num(row.last), prev_close: num(row.prev_close) });
  }
  const sectors = new Map<string, string | null>();
  for (const row of asRows<Record<string, unknown>>(instrumentsRes.data)) {
    sectors.set(String(row.id), row.sector == null ? null : String(row.sector));
  }
  const marked: MarkedPositionInput[] = asRows<Record<string, unknown>>(positionsRes.data).map(
    (row) => {
      const instrumentId = String(row.instrument_id);
      const quote = quotes.get(instrumentId);
      return {
        id: String(row.id),
        instrument_id: instrumentId,
        symbol: String(row.symbol),
        sector: sectors.get(instrumentId) ?? null,
        qty: num(row.qty),
        avg_cost: num(row.avg_cost),
        realized_pnl: num(row.realized_pnl),
        last: quote?.last ?? 0,
        prev_close: quote?.prev_close ?? 0,
      };
    },
  );
  const range: EquityCurveRange = parsed.data.range ?? "1Y";
  const snapshots = filterEquityCurve(
    asRows<Record<string, unknown>>(snapshotsRes.data).map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      account_id: String(row.account_id),
      as_of_date: String(row.as_of_date).slice(0, 10),
      equity: num(row.equity),
      cash: num(row.cash),
      buying_power: num(row.buying_power),
      created_at: String(row.created_at),
    })),
    range,
    new Date(),
  );
  const payload = assemblePortfolio({
    account: {
      id: String(account.id),
      cash: num(account.cash_balance),
      reserved_cash: num(account.reserved_cash),
      currency: String(account.currency ?? "USD"),
    },
    positions: marked,
    snapshots,
  });
  return json(200, portfolioResponseSchema.parse(payload));
}
