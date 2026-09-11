/**
 * Orchestration source for `alert-runner`. Deno deploy is a single file:
 * bundle to `alert-runner.ts` with esbuild (`--external:npm:@insforge/sdk`).
 */
import { createAdminClient } from "npm:@insforge/sdk";
import {
  alertInstanceSchema,
  alertRuleSchema,
  alertRunnerRequestSchema,
  alertRunnerResponseSchema,
  evaluateDomainResponseSchema,
  type AlertRule,
  type EvaluateDomainResponse,
  type NewsItem,
  type QuoteTick,
} from "../../packages/schemas/src/index.ts";
import {
  runAlertCycle,
  utcDay,
  type AlertMarketContext,
  type AlertRuleSnapshot,
} from "../../packages/rules-engine/src/index.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function asRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function evaluateAlertingDomain(input: {
  baseUrl: string;
  apiKey: string;
  userId: string;
  context: Record<string, unknown>;
}): Promise<EvaluateDomainResponse> {
  const response = await fetch(`${input.baseUrl.replace(/\/+$/, "")}/functions/rules-service`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      domain: "alerting",
      context: input.context,
      userId: input.userId,
    }),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(`RULES_SERVICE_${response.status}`);
  }
  return evaluateDomainResponseSchema.parse(body);
}

export default async function (req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  const expected = Deno.env.get("API_KEY") ?? Deno.env.get("INSFORGE_API_KEY");
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!expected || token !== expected) {
    return json(401, { error: "UNAUTHENTICATED" });
  }

  const baseUrl = Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL") ?? "";
  const admin = createAdminClient({
    baseUrl,
    apiKey: expected,
  });

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = alertRunnerRequestSchema.parse(body);
  const clock = parsed.clock ? new Date(parsed.clock) : new Date();
  const ticks: QuoteTick[] = parsed.ticks ?? [];
  const news: NewsItem[] = parsed.news ?? [];

  const rulesRes = await admin.database.from("alert_rules").select("*").eq("active", true);
  if (rulesRes.error) {
    return json(500, { error: rulesRes.error.message });
  }
  const rules: AlertRule[] = asRows<unknown>(rulesRes.data).map((row) =>
    alertRuleSchema.parse(row),
  );
  if (rules.length === 0) {
    return json(200, alertRunnerResponseSchema.parse({ evaluated: 0, fired: 0, suppressed: 0 }));
  }

  const instrumentIds = new Set<string>();
  for (const rule of rules) {
    if (rule.instrument_id) {
      instrumentIds.add(rule.instrument_id);
    }
  }
  for (const tick of ticks) {
    instrumentIds.add(tick.instrument_id);
  }

  const instRes = await admin.database.from("instruments").select("id,symbol");
  if (instRes.error) {
    return json(500, { error: instRes.error.message });
  }
  const instruments = asRows<{ id: string; symbol: string }>(instRes.data);
  const symbolById = new Map(instruments.map((row) => [row.id, row.symbol]));
  const idBySymbol = new Map(instruments.map((row) => [row.symbol.toUpperCase(), row.id]));

  for (const item of news) {
    for (const symbol of item.symbols) {
      const id = idBySymbol.get(symbol.toUpperCase());
      if (id) {
        instrumentIds.add(id);
      }
    }
  }

  const ids = [...instrumentIds];
  const quoteRes =
    ids.length > 0
      ? await admin.database.from("quotes_latest").select("*").in("instrument_id", ids)
      : { data: [], error: null };
  if (quoteRes.error) {
    return json(500, { error: quoteRes.error.message });
  }
  const quotes = new Map<string, { last: number; prev_close: number; volume: number }>();
  for (const row of asRows<Record<string, unknown>>(quoteRes.data)) {
    quotes.set(String(row.instrument_id), {
      last: num(row.last),
      prev_close: num(row.prev_close),
      volume: num(row.volume),
    });
  }
  for (const tick of ticks) {
    quotes.set(tick.instrument_id, {
      last: tick.last,
      prev_close: tick.prev_close,
      volume: tick.volume,
    });
  }

  const rsiRes =
    ids.length > 0
      ? await admin.database
          .from("instrument_daily_rsi")
          .select("instrument_id,rsi_14")
          .in("instrument_id", ids)
      : { data: [], error: null };
  if (rsiRes.error) {
    return json(500, { error: rsiRes.error.message });
  }
  const rsiById = new Map<string, number | null>();
  for (const row of asRows<Record<string, unknown>>(rsiRes.data)) {
    rsiById.set(String(row.instrument_id), row.rsi_14 == null ? null : num(row.rsi_14));
  }

  const newsRes = await admin.database
    .from("news_items")
    .select("ts,symbols,sentiment")
    .order("ts", { ascending: false })
    .limit(200);
  if (newsRes.error) {
    return json(500, { error: newsRes.error.message });
  }
  const sentimentBySymbol = new Map<string, number>();
  for (const item of news) {
    for (const symbol of item.symbols) {
      sentimentBySymbol.set(symbol.toUpperCase(), item.sentiment);
    }
  }
  for (const row of asRows<{ ts: string; symbols: string[]; sentiment: number }>(newsRes.data)) {
    for (const symbol of row.symbols ?? []) {
      const key = symbol.toUpperCase();
      if (!sentimentBySymbol.has(key)) {
        sentimentBySymbol.set(key, num(row.sentiment));
      }
    }
  }

  const markets: AlertMarketContext[] = ids.map((id) => {
    const quote = quotes.get(id);
    const symbol = symbolById.get(id);
    return {
      instrument_id: id,
      symbol,
      last: quote?.last ?? 0,
      prev_close: quote?.prev_close ?? 0,
      volume: quote?.volume ?? 0,
      rsi_14: rsiById.get(id) ?? null,
      news_sentiment: symbol ? (sentimentBySymbol.get(symbol.toUpperCase()) ?? null) : null,
    };
  });

  const dayStart = `${utcDay(clock)}T00:00:00.000Z`;
  const todayRes = await admin.database.from("alerts").select("user_id").gte("fired_at", dayStart);
  if (todayRes.error) {
    return json(500, { error: todayRes.error.message });
  }
  const userAlertsToday = new Map<string, number>();
  for (const row of asRows<{ user_id: string }>(todayRes.data)) {
    userAlertsToday.set(row.user_id, (userAlertsToday.get(row.user_id) ?? 0) + 1);
  }

  const snapshots: AlertRuleSnapshot[] = rules.map((rule) => ({
    id: rule.id,
    user_id: rule.user_id,
    instrument_id: rule.instrument_id,
    name: rule.name,
    condition: rule.condition,
    active: rule.active,
    throttle_state: rule.throttle_state,
  }));

  let cycle;
  try {
    cycle = await runAlertCycle({
      rules: snapshots,
      markets,
      clock,
      userAlertsToday,
      evaluateAlerting: async (context, _clock, meta) => {
        const result = await evaluateAlertingDomain({
          baseUrl,
          apiKey: expected,
          userId: meta.userId,
          context,
        });
        return { outcome: result.outcome };
      },
    });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : "ALERT_CYCLE_FAILED" });
  }

  for (const update of cycle.ruleUpdates) {
    const { error } = await admin.database
      .from("alert_rules")
      .update({ active: update.active, throttle_state: update.throttle_state })
      .eq("id", update.id);
    if (error) {
      return json(500, { error: error.message });
    }
  }

  let fired = 0;
  for (const draft of cycle.fires) {
    const id = crypto.randomUUID();
    const firedAt = clock.toISOString();
    const { error: insertError } = await admin.database.from("alerts").insert([
      {
        id,
        user_id: draft.user_id,
        alert_rule_id: draft.alert_rule_id,
        instrument_id: draft.instrument_id,
        fired_at: firedAt,
        message: draft.message,
        payload: draft.payload,
        read: false,
      },
    ]);
    if (insertError) {
      return json(500, { error: insertError.message });
    }
    const alert = alertInstanceSchema.parse({
      id,
      user_id: draft.user_id,
      alert_rule_id: draft.alert_rule_id,
      instrument_id: draft.instrument_id,
      fired_at: firedAt,
      message: draft.message,
      payload: draft.payload,
      read: false,
      created_at: firedAt,
    });
    await admin.database.from("audit_log").insert([
      {
        user_id: draft.user_id,
        action: "alert:fire",
        entity_type: "alerts",
        entity_id: id,
        payload: { alert_rule_id: draft.alert_rule_id, message: draft.message },
      },
    ]);
    const published = await admin.database.rpc("publish_alert_event", {
      p_user_id: draft.user_id,
      payload: { kind: "alert", alert },
    });
    if (published.error) {
      return json(500, { error: published.error.message });
    }
    fired += 1;
  }

  return json(
    200,
    alertRunnerResponseSchema.parse({
      evaluated: snapshots.length,
      fired,
      suppressed: cycle.suppressed,
    }),
  );
}
