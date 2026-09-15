/**
 * Orchestration source for `brief-service`. Bundle to `brief-service.ts`
 * (`--external:npm:@insforge/sdk`) before deploy.
 */
import { createAdminClient, createClient } from "npm:@insforge/sdk";
import {
  nyClockParts,
  nyseSessionState,
  type MarketCalendarRow,
} from "../../packages/mock-data/src/index.ts";
import {
  BRIEFS_BUCKET,
  assemblePortfolio,
  briefCronResponseSchema,
  briefExportResponseSchema,
  briefGenerateResponseSchema,
  briefListResponseSchema,
  briefSchema,
  evaluateDomainResponseSchema,
  type Brief,
  type BriefKind,
  type CopilotCitation,
  type EvaluateDomainResponse,
  type MarkedPositionInput,
  type PortfolioResponse,
} from "../../packages/schemas/src/index.ts";
import { resolveRulesServiceApiKey } from "../../packages/rules-engine/src/index.ts";
import {
  DEFAULT_OPENROUTER_CHAT_MODEL,
  DEFAULT_OPENROUTER_CHAT_URL,
  fakeBriefLlm,
  flagsFromCollectOutcome,
  generateBriefMarkdown,
  openRouterBriefLlm,
  portfolioAnalysisFactsFromBook,
  renderBriefPdf,
  type BriefPack,
  type LlmPort,
} from "../../packages/copilot/src/index.ts";
import { authorizeEdgeUser } from "./_shared/entitlements.ts";
import { writeAuditLog } from "./_shared/audit.ts";
import { withFunctionLog } from "./_shared/logger.ts";

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

function asRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

type Admin = ReturnType<typeof createAdminClient>;

function briefLlm(): LlmPort {
  if (Deno.env.get("MERIDIAN_COPILOT_LLM") === "fake") {
    return fakeBriefLlm();
  }
  const apiKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  if (!apiKey) {
    return fakeBriefLlm();
  }
  return openRouterBriefLlm({
    apiKey,
    model: Deno.env.get("OPENROUTER_CHAT_MODEL") ?? DEFAULT_OPENROUTER_CHAT_MODEL,
    url: Deno.env.get("OPENROUTER_CHAT_URL") ?? DEFAULT_OPENROUTER_CHAT_URL,
  });
}

async function invokeSibling(input: {
  baseUrl: string;
  slug: string;
  token: string;
  body: unknown;
}): Promise<unknown> {
  const origin = input.baseUrl.replace(/\/+$/, "");
  const response = await fetch(`${origin}/functions/${input.slug}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.body),
  });
  const raw: unknown = await response.json().catch(() => ({ error: "SIBLING_UNAVAILABLE" }));
  if (!response.ok) {
    throw new Error(
      typeof raw === "object" && raw && "error" in raw
        ? String((raw as { error?: unknown }).error)
        : `SIBLING_${response.status}`,
    );
  }
  return raw;
}

async function loadCalendar(admin: Admin): Promise<MarketCalendarRow[]> {
  const { data, error } = await admin.database
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

async function loadPortfolioForUser(admin: Admin, userId: string): Promise<PortfolioResponse> {
  const [accountsRes, positionsRes, quotesRes, instrumentsRes] = await Promise.all([
    admin.database
      .from("accounts")
      .select("id,user_id,cash_balance,reserved_cash,currency")
      .eq("user_id", userId),
    admin.database
      .from("positions")
      .select("id,user_id,account_id,instrument_id,symbol,qty,avg_cost,realized_pnl")
      .eq("user_id", userId),
    admin.database.from("quotes_latest").select("instrument_id,last,prev_close"),
    admin.database.from("instruments").select("id,sector,beta_class,symbol"),
  ]);
  for (const res of [accountsRes, positionsRes, quotesRes, instrumentsRes]) {
    if (res.error) {
      throw new Error(res.error.message);
    }
  }
  const account = asRows<Record<string, unknown>>(accountsRes.data)[0];
  if (!account) {
    throw new Error("ACCOUNT_MISSING");
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
  return assemblePortfolio({
    account: {
      id: String(account.id),
      cash: num(account.cash_balance),
      reserved_cash: num(account.reserved_cash),
      currency: String(account.currency ?? "USD"),
    },
    positions: marked,
  });
}

async function betaClassBySymbol(admin: Admin): Promise<Record<string, "low" | "medium" | "high">> {
  const { data, error } = await admin.database.from("instruments").select("symbol,beta_class");
  if (error) {
    throw new Error(error.message);
  }
  const out: Record<string, "low" | "medium" | "high"> = {};
  for (const row of asRows<Record<string, unknown>>(data)) {
    const cls = row.beta_class;
    if (cls === "low" || cls === "medium" || cls === "high") {
      out[String(row.symbol)] = cls;
    }
  }
  return out;
}

async function loadNewsItems(
  admin: Admin,
  symbols: string[],
): Promise<Array<{ id: string; headline?: string; symbols?: string[] }>> {
  const { data, error } = await admin.database
    .from("news_items")
    .select("id,headline,symbols,ts")
    .order("ts", { ascending: false })
    .limit(20);
  if (error) {
    throw new Error(error.message);
  }
  const wanted = new Set(symbols.map((s) => s.toUpperCase()));
  const rows = asRows<Record<string, unknown>>(data).map((row) => ({
    id: String(row.id),
    headline: typeof row.headline === "string" ? row.headline : undefined,
    symbols: Array.isArray(row.symbols)
      ? row.symbols.filter((s): s is string => typeof s === "string")
      : [],
  }));
  if (wanted.size === 0) {
    return rows.slice(0, 8);
  }
  const filtered = rows.filter((row) => row.symbols.some((s) => wanted.has(s.toUpperCase())));
  return (filtered.length > 0 ? filtered : rows).slice(0, 8);
}

async function buildPack(input: {
  admin: Admin;
  baseUrl: string;
  token: string;
  apiKey: string;
  userId: string;
  kind: BriefKind;
  subject?: string;
}): Promise<{ pack: BriefPack; subject: string }> {
  const calendar = await loadCalendar(input.admin);
  const now = new Date();
  const session = nyseSessionState(now, calendar);
  const portfolio = await loadPortfolioForUser(input.admin, input.userId);
  const posSymbols = portfolio.positions.map((row) => row.symbol);

  if (input.kind === "portfolio") {
    const facts = portfolioAnalysisFactsFromBook({
      portfolio,
      betaClassBySymbol: await betaClassBySymbol(input.admin),
    });
    const rules = evaluateDomainResponseSchema.parse(
      await invokeSibling({
        baseUrl: input.baseUrl,
        slug: "rules-service",
        token: input.apiKey,
        body: {
          op: "evaluateDomain",
          domain: "portfolio_analysis",
          context: facts,
          userId: input.userId,
        },
      }),
    ) as EvaluateDomainResponse;
    return {
      subject: "portfolio",
      pack: {
        kind: "portfolio",
        facts,
        flags: flagsFromCollectOutcome(rules.outcome),
        outcome: rules.outcome,
        audit_id: rules.auditId,
        table_versions: rules.tableVersions,
      },
    };
  }

  if (input.kind === "instrument") {
    const symbol = (input.subject ?? posSymbols[0] ?? "AAPL").toUpperCase();
    const inst = await input.admin.database.from("instruments").select("*").eq("symbol", symbol);
    const instrument = asRows<Record<string, unknown>>(inst.data)[0] ?? { symbol };
    const instrumentId = typeof instrument.id === "string" ? instrument.id : null;
    const fundRow = instrumentId
      ? await input.admin.database
          .from("fundamentals")
          .select("*")
          .eq("instrument_id", instrumentId)
      : { data: [] as unknown[], error: null };
    const news = await loadNewsItems(input.admin, [symbol]);
    let cited = news;
    try {
      const searched = await invokeSibling({
        baseUrl: input.baseUrl,
        slug: "search-news",
        token: input.token,
        body: { query: `${symbol} thesis`, symbols: [symbol], limit: 5 },
      });
      if (searched && typeof searched === "object" && "items" in searched) {
        const items = (searched as { items: typeof news }).items;
        if (Array.isArray(items) && items.length > 0) {
          cited = items;
        }
      }
    } catch {
      cited = news;
    }
    return {
      subject: symbol,
      pack: {
        kind: "instrument",
        symbol,
        fundamentals: {
          instrument,
          fundamentals: asRows(fundRow.data)[0] ?? null,
        },
        news: cited,
      },
    };
  }

  const lists = await input.admin.database
    .from("watchlists")
    .select("id")
    .eq("user_id", input.userId);
  const listIds = asRows<Record<string, unknown>>(lists.data).map((row) => String(row.id));
  let watchSymbols: string[] = [];
  if (listIds.length > 0) {
    const items = await input.admin.database
      .from("watchlist_items")
      .select("instrument_id,watchlist_id");
    const idToSymbol = new Map(
      asRows<Record<string, unknown>>(
        (await input.admin.database.from("instruments").select("id,symbol")).data,
      ).map((row) => [String(row.id), String(row.symbol)]),
    );
    watchSymbols = asRows<Record<string, unknown>>(items.data)
      .filter((row) => listIds.includes(String(row.watchlist_id)))
      .map((row) => idToSymbol.get(String(row.instrument_id)) ?? "")
      .filter((s) => s.length > 0);
  }
  const instruments = await input.admin.database.from("instruments").select("id,symbol");
  const symbolById = new Map(
    asRows<Record<string, unknown>>(instruments.data).map((row) => [
      String(row.id),
      String(row.symbol),
    ]),
  );
  const quotes = await input.admin.database
    .from("quotes_latest")
    .select("instrument_id,last,prev_close");
  const wantedWatch = new Set(watchSymbols.map((s) => s.toUpperCase()));
  const movers = asRows<Record<string, unknown>>(quotes.data)
    .map((row) => {
      const symbol = symbolById.get(String(row.instrument_id)) ?? "";
      const last = num(row.last);
      const prev = num(row.prev_close);
      return {
        symbol,
        last,
        prev_close: prev,
        change_pct: prev === 0 ? 0 : ((last - prev) / prev) * 100,
      };
    })
    .filter((row) => wantedWatch.has(row.symbol.toUpperCase()));
  const alertsRes = await input.admin.database
    .from("alerts")
    .select("id,message,fired_at,payload")
    .eq("user_id", input.userId)
    .order("fired_at", { ascending: false })
    .limit(10);
  const symbols = [...new Set([...posSymbols, ...watchSymbols])];
  let news = await loadNewsItems(input.admin, symbols);
  try {
    const searched = await invokeSibling({
      baseUrl: input.baseUrl,
      slug: "search-news",
      token: input.token,
      body: {
        query: `morning digest ${symbols.slice(0, 6).join(" ")}`.trim() || "markets",
        symbols: symbols.slice(0, 8),
        limit: 8,
      },
    });
    if (searched && typeof searched === "object" && "items" in searched) {
      const items = (searched as { items: typeof news }).items;
      if (Array.isArray(items) && items.length > 0) {
        news = items;
      }
    }
  } catch {
    // news_items fallback
  }
  const today = nyClockParts(now).dateKey;
  const todayCal = calendar.find((row) => row.session_date === today) ?? null;
  return {
    subject: "morning",
    pack: {
      kind: "morning",
      as_of: now.toISOString(),
      session,
      portfolio,
      watchlist_movers: movers,
      news,
      alerts: asRows(alertsRes.data),
      calendar: todayCal,
    },
  };
}

async function persistBrief(input: {
  admin: Admin;
  userId: string;
  kind: BriefKind;
  subject: string;
  content_md: string;
  data: Record<string, unknown>;
}): Promise<Brief> {
  const insert = await input.admin.database.from("briefs").insert([
    {
      user_id: input.userId,
      kind: input.kind,
      subject: input.subject,
      content_md: input.content_md,
      data: input.data,
      pdf_key: null,
      pdf_url: null,
    },
  ]);
  if (insert.error) {
    throw new Error(insert.error.message);
  }
  const listed = await input.admin.database
    .from("briefs")
    .select("*")
    .eq("user_id", input.userId)
    .eq("kind", input.kind)
    .eq("subject", input.subject)
    .order("created_at", { ascending: false })
    .limit(1);
  if (listed.error) {
    throw new Error(listed.error.message);
  }
  return briefSchema.parse(asRows(listed.data)[0]);
}

async function generateForUser(input: {
  admin: Admin;
  baseUrl: string;
  token: string;
  apiKey: string;
  userId: string;
  kind: BriefKind;
  subject?: string;
}): Promise<{ brief: Brief; citations: CopilotCitation[] }> {
  const { pack, subject } = await buildPack(input);
  const { content_md, citations } = await generateBriefMarkdown({ pack, llm: briefLlm() });
  const brief = await persistBrief({
    admin: input.admin,
    userId: input.userId,
    kind: input.kind,
    subject,
    content_md,
    data: {
      pack,
      citations,
    },
  });
  await writeAuditLog(input.admin.database, {
    user_id: input.userId,
    action: "briefs:generate",
    entity_type: "briefs",
    entity_id: brief.id,
    payload: { kind: input.kind, subject },
    after: { kind: input.kind, subject },
  });
  return { brief, citations };
}

export default withFunctionLog("brief-service", async function (req: Request): Promise<Response> {
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

  const apiKey = resolveRulesServiceApiKey({
    API_KEY: Deno.env.get("API_KEY"),
    INSFORGE_API_KEY: Deno.env.get("INSFORGE_API_KEY"),
  });
  if (!apiKey) {
    return json(500, { error: "API_KEY_MISSING" });
  }
  const admin = createAdminClient({ baseUrl, apiKey });
  const op =
    body && typeof body === "object" && "op" in body
      ? String((body as { op?: unknown }).op ?? "generate")
      : "generate";

  if (op === "cron") {
    if (token !== apiKey) {
      return json(401, { error: "UNAUTHENTICATED" });
    }
    const force =
      body && typeof body === "object" && "force" in body
        ? Boolean((body as { force?: unknown }).force)
        : false;
    const calendar = await loadCalendar(admin);
    const now = new Date();
    const session = nyseSessionState(now, calendar);
    if (session !== "OPEN" && !force) {
      return json(200, briefCronResponseSchema.parse({ generated: 0, skipped: 0 }));
    }
    const profiles = await admin.database
      .from("profiles")
      .select("user_id,morning_brief_opt_in")
      .eq("morning_brief_opt_in", true);
    if (profiles.error) {
      return json(500, { error: profiles.error.message });
    }
    const today = now.toISOString().slice(0, 10);
    let generated = 0;
    let skipped = 0;
    for (const row of asRows<Record<string, unknown>>(profiles.data)) {
      const userId = String(row.user_id);
      const existing = await admin.database
        .from("briefs")
        .select("id,created_at")
        .eq("user_id", userId)
        .eq("kind", "morning")
        .gte("created_at", `${today}T00:00:00.000Z`);
      if (!force && asRows(existing.data).length > 0) {
        skipped += 1;
        continue;
      }
      try {
        await generateForUser({
          admin,
          baseUrl,
          token: apiKey,
          apiKey,
          userId,
          kind: "morning",
        });
        generated += 1;
      } catch {
        skipped += 1;
      }
    }
    await writeAuditLog(admin.database, {
      user_id: null,
      action: "briefs:cron",
      entity_type: "briefs",
      payload: { generated, skipped },
    });
    return json(200, briefCronResponseSchema.parse({ generated, skipped }));
  }

  const userClient = createClient({ baseUrl, accessToken: token });
  const { data: userData } = await userClient.auth.getCurrentUser();
  const userId = userData?.user?.id as string | undefined;
  const gate = await authorizeEdgeUser({ db: admin.database, userId, action: "copilot:chat" });
  if (!gate.allowed || !userId) {
    return json(gate.reason === "UNAUTHENTICATED" || !userId ? 401 : 403, {
      error: gate.reason ?? "UNAUTHENTICATED",
    });
  }

  if (op === "list") {
    const kind =
      body && typeof body === "object" && "kind" in body
        ? (body as { kind?: unknown }).kind
        : undefined;
    let query = admin.database
      .from("briefs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (kind === "morning" || kind === "instrument" || kind === "portfolio") {
      query = query.eq("kind", kind);
    }
    const listed = await query;
    if (listed.error) {
      return json(500, { error: listed.error.message });
    }
    return json(
      200,
      briefListResponseSchema.parse({
        briefs: asRows(listed.data).map((row) => briefSchema.parse(row)),
      }),
    );
  }

  if (op === "export") {
    const briefId =
      body && typeof body === "object" && "brief_id" in body
        ? String((body as { brief_id?: unknown }).brief_id)
        : "";
    const found = await admin.database
      .from("briefs")
      .select("*")
      .eq("id", briefId)
      .eq("user_id", userId)
      .limit(1);
    if (found.error) {
      return json(500, { error: found.error.message });
    }
    const row = asRows(found.data)[0];
    if (!row) {
      return json(404, { error: "BRIEF_NOT_FOUND" });
    }
    const brief = briefSchema.parse(row);
    const pdf = renderBriefPdf(
      brief.kind === "morning"
        ? "Morning Brief"
        : brief.kind === "instrument"
          ? `Instrument Brief ${brief.subject}`
          : "Portfolio Health",
      brief.content_md,
    );
    const key = `${userId}/${brief.id}.pdf`;
    const bucket = Deno.env.get("BRIEFS_BUCKET") ?? BRIEFS_BUCKET;
    const blob = new Blob([pdf], { type: "application/pdf" });
    const uploaded = await admin.storage.from(bucket).upload(key, blob);
    if (uploaded.error || !uploaded.data) {
      return json(500, { error: uploaded.error?.message ?? "PDF_UPLOAD_FAILED" });
    }
    const downloadUrl = uploaded.data.url;
    const patch = await admin.database
      .from("briefs")
      .update({ pdf_key: uploaded.data.key, pdf_url: downloadUrl })
      .eq("id", brief.id)
      .eq("user_id", userId);
    if (patch.error) {
      return json(500, { error: patch.error.message });
    }
    await writeAuditLog(admin.database, {
      user_id: userId,
      action: "briefs:export",
      entity_type: "briefs",
      entity_id: brief.id,
      payload: { key: uploaded.data.key },
    });
    return json(
      200,
      briefExportResponseSchema.parse({
        brief: { ...brief, pdf_key: uploaded.data.key, pdf_url: downloadUrl },
        download_url: downloadUrl,
      }),
    );
  }

  const kind =
    body && typeof body === "object" && "kind" in body
      ? (body as { kind?: unknown }).kind
      : undefined;
  if (kind !== "morning" && kind !== "instrument" && kind !== "portfolio") {
    return json(400, { error: "INVALID_BODY" });
  }
  const subject =
    body && typeof body === "object" && typeof (body as { subject?: unknown }).subject === "string"
      ? (body as { subject: string }).subject
      : undefined;
  try {
    const result = await generateForUser({
      admin,
      baseUrl,
      token,
      apiKey,
      userId,
      kind,
      subject,
    });
    return json(200, briefGenerateResponseSchema.parse(result));
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : "BRIEF_FAILED" });
  }
});
