/**
 * Orchestration source for `monitor-runner`. Deno deploy is a single file:
 * bundle to `monitor-runner.ts` with esbuild (`--external:npm:@insforge/sdk`).
 */
import { createAdminClient } from "npm:@insforge/sdk";
import {
  alertInstanceSchema,
  evaluateDomainResponseSchema,
  monitorRunnerRequestSchema,
  monitorRunnerResponseSchema,
  monitorSchema,
  type EvaluateDomainResponse,
  type Monitor,
} from "../../packages/schemas/src/index.ts";
import {
  runMonitorCycle,
  utcDay,
  type MonitorFacts,
  type MonitorSnapshot,
} from "../../packages/rules-engine/src/index.ts";
import { groundedMonitorExplanation } from "../../packages/copilot/src/monitor-explain.ts";
import { formatVectorLiteral, hashEmbed } from "../../packages/rag/src/index.ts";

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
  const parsed = monitorRunnerRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, { error: "INVALID_BODY" });
  }
  const clock = parsed.data.clock ? new Date(parsed.data.clock) : new Date();

  let query = admin.database.from("monitors").select("*").eq("active", true);
  if (parsed.data.user_id) {
    query = query.eq("user_id", parsed.data.user_id);
  }
  const monitorsRes = await query;
  if (monitorsRes.error) {
    return json(500, { error: monitorsRes.error.message });
  }
  const monitors: Monitor[] = asRows<unknown>(monitorsRes.data).map((row) =>
    monitorSchema.parse(row),
  );
  if (monitors.length === 0) {
    return json(200, monitorRunnerResponseSchema.parse({ evaluated: 0, fired: 0, suppressed: 0 }));
  }

  const instRes = await admin.database.from("instruments").select("id,symbol,sector");
  if (instRes.error) {
    return json(500, { error: instRes.error.message });
  }
  const instruments = asRows<{ id: string; symbol: string; sector: string | null }>(instRes.data);
  const byId = new Map(instruments.map((row) => [row.id, row]));
  const bySymbol = new Map(instruments.map((row) => [row.symbol.toUpperCase(), row]));

  const quoteRes = await admin.database.from("quotes_latest").select("*");
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

  const rsiRes = await admin.database.from("instrument_daily_rsi").select("instrument_id,rsi_14");
  if (rsiRes.error) {
    return json(500, { error: rsiRes.error.message });
  }
  const rsiById = new Map<string, number | null>();
  for (const row of asRows<Record<string, unknown>>(rsiRes.data)) {
    rsiById.set(String(row.instrument_id), row.rsi_14 == null ? null : num(row.rsi_14));
  }

  const posRes = await admin.database.from("positions").select("*");
  if (posRes.error) {
    return json(500, { error: posRes.error.message });
  }
  const positions = asRows<{
    user_id: string;
    instrument_id: string;
    symbol: string;
    qty: number;
  }>(posRes.data);

  const newsRes = await admin.database
    .from("news_items")
    .select("id,ts,symbols,sentiment,sector,headline")
    .order("ts", { ascending: false })
    .limit(200);
  if (newsRes.error) {
    return json(500, { error: newsRes.error.message });
  }
  const news = asRows<{
    id: string;
    symbols: string[];
    sentiment: number;
    sector: string | null;
    headline: string;
  }>(newsRes.data);

  const dayStart = `${utcDay(clock)}T00:00:00.000Z`;
  const todayRes = await admin.database.from("alerts").select("user_id").gte("fired_at", dayStart);
  if (todayRes.error) {
    return json(500, { error: todayRes.error.message });
  }
  const userAlertsToday = new Map<string, number>();
  for (const row of asRows<{ user_id: string }>(todayRes.data)) {
    userAlertsToday.set(row.user_id, (userAlertsToday.get(row.user_id) ?? 0) + 1);
  }

  const snapshots: MonitorSnapshot[] = monitors.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    nl_instruction: row.nl_instruction,
    compiled_condition: row.compiled_condition,
    scope: row.scope,
    cadence: row.cadence,
    last_run: row.last_run,
    active: row.active,
    throttle_state: row.throttle_state,
    propose_action: row.propose_action ?? null,
  }));

  const hybridHits = new Map<string, Array<{ id: string; sentiment: number; headline: string }>>();
  for (const monitor of monitors) {
    const usesNews = monitor.compiled_condition.conditions.some(
      (cell) => cell.input === "news_sentiment",
    );
    if (!usesNews) {
      continue;
    }
    const symbols =
      monitor.scope.kind === "symbols"
        ? (monitor.scope.symbols ?? []).map((s) => s.toUpperCase())
        : positions.filter((p) => p.user_id === monitor.user_id).map((p) => p.symbol.toUpperCase());
    try {
      const rpc = await admin.database.rpc("search_news_hybrid", {
        query_embedding: formatVectorLiteral(hashEmbed(monitor.nl_instruction)),
        p_symbols: symbols.length > 0 ? symbols : null,
        p_since: null,
        p_limit: 5,
      });
      if (!rpc.error) {
        hybridHits.set(
          monitor.id,
          asRows<{ id: string; sentiment?: number; headline?: string }>(rpc.data).map((hit) => ({
            id: hit.id,
            sentiment: num(hit.sentiment),
            headline: hit.headline ?? hit.id,
          })),
        );
      }
    } catch {
      // news_items fallback below
    }
  }

  function factsFor(monitor: MonitorSnapshot): MonitorFacts | null {
    const userPositions = positions.filter((row) => row.user_id === monitor.user_id);
    const scopeSymbols = new Set<string>();
    if (monitor.scope.kind === "symbols") {
      for (const symbol of monitor.scope.symbols ?? []) {
        scopeSymbols.add(symbol.toUpperCase());
      }
    } else if (monitor.scope.kind === "sector") {
      const sector = (monitor.scope.sector ?? "").toLowerCase();
      for (const inst of instruments) {
        if ((inst.sector ?? "").toLowerCase() === sector) {
          scopeSymbols.add(inst.symbol.toUpperCase());
        }
      }
    } else {
      for (const pos of userPositions) {
        scopeSymbols.add(pos.symbol.toUpperCase());
      }
    }

    let worst = 0;
    let portfolioDay = 0;
    let portfolioPrev = 0;
    let sample: {
      symbol: string;
      last: number;
      pct: number;
      volume: number;
      rsi: number | null;
    } | null = null;
    for (const symbol of scopeSymbols) {
      const inst = bySymbol.get(symbol);
      if (!inst) {
        continue;
      }
      const quote = quotes.get(inst.id);
      if (!quote || quote.prev_close === 0) {
        continue;
      }
      const pct = ((quote.last - quote.prev_close) / quote.prev_close) * 100;
      if (!sample || pct < sample.pct) {
        sample = {
          symbol,
          last: quote.last,
          pct,
          volume: quote.volume,
          rsi: rsiById.get(inst.id) ?? null,
        };
      }
      const pos = userPositions.find((row) => row.instrument_id === inst.id);
      if (pos) {
        if (pct < worst) {
          worst = pct;
        }
        portfolioDay += pos.qty * (quote.last - quote.prev_close);
        portfolioPrev += pos.qty * quote.prev_close;
      }
    }
    const portfolioPct = portfolioPrev === 0 ? 0 : (portfolioDay / portfolioPrev) * 100;
    const positionDayPct =
      parsed.data.force_position_day_pct !== undefined ? parsed.data.force_position_day_pct : worst;

    let newsSentiment: number | null = null;
    const cited: string[] = [];
    const hits = hybridHits.get(monitor.id) ?? [];
    if (hits.length > 0) {
      newsSentiment = hits[0]?.sentiment ?? null;
      for (const hit of hits.slice(0, 3)) {
        cited.push(`news:${hit.id}`);
      }
    } else {
      for (const item of news) {
        const matchSymbol = (item.symbols ?? []).some((s) => scopeSymbols.has(s.toUpperCase()));
        const matchSector =
          monitor.scope.kind === "sector" &&
          (item.sector ?? "").toLowerCase() === (monitor.scope.sector ?? "").toLowerCase();
        if (matchSymbol || matchSector) {
          newsSentiment = num(item.sentiment);
          cited.push(`news:${item.id}`);
          break;
        }
      }
    }

    if (
      parsed.data.force_position_day_pct === undefined &&
      scopeSymbols.size === 0 &&
      hits.length === 0
    ) {
      return {
        position_day_pct: positionDayPct,
        portfolio_day_pct: portfolioPct,
        news_sentiment: newsSentiment,
        cited,
      };
    }

    return {
      position_day_pct: positionDayPct,
      portfolio_day_pct: portfolioPct,
      pct_chg: sample?.pct ?? positionDayPct,
      last: sample?.last ?? 0,
      volume: sample?.volume ?? 0,
      rsi_14: sample?.rsi ?? null,
      news_sentiment: newsSentiment,
      symbol: sample?.symbol,
      cited,
    };
  }

  let cycle;
  try {
    cycle = await runMonitorCycle({
      monitors: snapshots,
      factsFor,
      clock,
      userAlertsToday,
      ignoreCadence: parsed.data.force === true || parsed.data.force_position_day_pct !== undefined,
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
    return json(500, { error: error instanceof Error ? error.message : "MONITOR_CYCLE_FAILED" });
  }

  for (const update of cycle.updates) {
    const { error } = await admin.database
      .from("monitors")
      .update({
        active: update.active,
        last_run: update.last_run,
        throttle_state: update.throttle_state,
      })
      .eq("id", update.id);
    if (error) {
      return json(500, { error: error.message });
    }
  }

  let fired = 0;
  for (const draft of cycle.fires) {
    const id = crypto.randomUUID();
    const firedAt = clock.toISOString();
    const explanation = groundedMonitorExplanation({
      name: draft.message,
      nl_instruction: String(draft.payload.nl_instruction ?? draft.message),
      facts: draft.facts,
      cited: Array.isArray(draft.facts.cited) ? draft.facts.cited.map((row) => String(row)) : [],
    });
    const { error: insertError } = await admin.database.from("alerts").insert([
      {
        id,
        user_id: draft.user_id,
        alert_rule_id: null,
        monitor_id: draft.monitor_id,
        instrument_id: draft.instrument_id,
        fired_at: firedAt,
        message: explanation,
        payload: { ...draft.payload, explanation },
        read: false,
      },
    ]);
    if (insertError) {
      return json(500, { error: insertError.message });
    }
    const alert = alertInstanceSchema.parse({
      id,
      user_id: draft.user_id,
      alert_rule_id: null,
      monitor_id: draft.monitor_id,
      instrument_id: draft.instrument_id,
      fired_at: firedAt,
      message: explanation,
      payload: { ...draft.payload, explanation },
      read: false,
      created_at: firedAt,
    });
    await admin.database.from("audit_log").insert([
      {
        user_id: draft.user_id,
        action: "monitor:fire",
        entity_type: "monitors",
        entity_id: draft.monitor_id,
        payload: { alert_id: id },
      },
    ]);
    const published = await admin.database.rpc("publish_alert_event", {
      p_user_id: draft.user_id,
      payload: { kind: "alert", alert },
    });
    if (published.error) {
      return json(500, { error: published.error.message });
    }
    if (draft.propose_action && draft.propose_action.tool === "propose_order") {
      const sessionRes = await admin.database
        .from("monitors")
        .select("session_id")
        .eq("id", draft.monitor_id)
        .limit(1);
      const sessionId = asRows<{ session_id: string | null }>(sessionRes.data)[0]?.session_id;
      if (sessionId) {
        await admin.database.from("copilot_actions").insert([
          {
            user_id: draft.user_id,
            session_id: sessionId,
            tool: "propose_order",
            payload: draft.propose_action,
            policy_outcome: { decision: "require_approval", table: "DT-AI-01" },
            status: "proposed",
          },
        ]);
      }
    }
    fired += 1;
  }

  return json(
    200,
    monitorRunnerResponseSchema.parse({
      evaluated: snapshots.length,
      fired,
      suppressed: cycle.suppressed,
    }),
  );
}
