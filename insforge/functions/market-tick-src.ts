/**
 * Orchestration source for `market-tick`. Deno deploy is a single file:
 * bundle to `market-tick.ts` with esbuild (`--external:npm:@insforge/sdk`)
 * from this module before `functions deploy market-tick --file insforge/functions/market-tick.ts`.
 */
import { createAdminClient } from "npm:@insforge/sdk";
import type { MarketCalendarRow } from "../../packages/mock-data/src/calendar.ts";
import {
  minuteBucketTs,
  parseFeedControls,
  runFeedInvocation,
  type FeedInstrument,
  type FeedMinuteBar,
  type FeedQuote,
} from "../../packages/mock-data/src/feed.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function asRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

function flagValue(row: {
  key?: unknown;
  value?: unknown;
}): { key: string; value: unknown } | null {
  if (typeof row.key !== "string") {
    return null;
  }
  return { key: row.key, value: row.value };
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

  const intervalRaw = Deno.env.get("MARKET_TICK_INTERVAL_SECONDS");
  const intervalSeconds = intervalRaw === undefined ? 1 : Number(intervalRaw);
  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    return json(500, { error: "INTERVAL_INVALID" });
  }

  const admin = createAdminClient({
    baseUrl: Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL"),
    apiKey: expected,
  });

  const { data: flagData, error: flagErr } = await admin.database
    .from("feature_flags")
    .select("id,key,value")
    .is("user_id", null);
  if (flagErr) {
    return json(500, { error: flagErr.message });
  }
  const flags = parseFeedControls(
    asRows<{ key: string; value: unknown }>(flagData)
      .map(flagValue)
      .filter((row): row is { key: string; value: unknown } => row !== null),
  );

  const { data: calData, error: calErr } = await admin.database
    .from("market_calendar")
    .select("session_date,venue,session_kind,open_minute,close_minute")
    .eq("venue", "NYSE");
  if (calErr) {
    return json(500, { error: calErr.message });
  }
  const calendar: MarketCalendarRow[] = asRows<{
    session_date: string;
    venue: string;
    session_kind: "regular" | "half";
    open_minute: number | string;
    close_minute: number | string;
  }>(calData).map((row) => ({
    session_date: String(row.session_date).slice(0, 10),
    venue: "NYSE",
    session_kind: row.session_kind,
    open_minute: Number(row.open_minute),
    close_minute: Number(row.close_minute),
  }));

  const { data: instData, error: instErr } = await admin.database
    .from("instruments")
    .select("id,symbol,tick_size,beta_class,avg_volume")
    .eq("status", "active");
  if (instErr) {
    return json(500, { error: instErr.message });
  }
  const instruments: FeedInstrument[] = asRows<{
    id: string;
    symbol: string;
    tick_size: number | string;
    beta_class: "low" | "medium" | "high" | null;
    avg_volume: number | string | null;
  }>(instData)
    .filter(
      (row) => row.beta_class === "low" || row.beta_class === "medium" || row.beta_class === "high",
    )
    .map((row) => ({
      id: row.id,
      symbol: row.symbol,
      tick_size: Number(row.tick_size),
      beta_class: row.beta_class,
      avg_volume: Number(row.avg_volume ?? 1),
    }));

  const { data: quoteData, error: quoteErr } = await admin.database
    .from("quotes_latest")
    .select("*");
  if (quoteErr) {
    return json(500, { error: quoteErr.message });
  }
  const quotes: FeedQuote[] = asRows<{
    instrument_id: string;
    bid: number | string;
    ask: number | string;
    last: number | string;
    prev_close: number | string;
    volume: number | string;
    ts: string;
  }>(quoteData).map((row) => ({
    instrument_id: row.instrument_id,
    bid: Number(row.bid),
    ask: Number(row.ask),
    last: Number(row.last),
    prev_close: Number(row.prev_close),
    volume: Number(row.volume),
    ts: row.ts,
  }));

  const minuteBars: FeedMinuteBar[] = [];
  const buckets = [...new Set(quotes.map((q) => minuteBucketTs(q.ts)))];
  if (buckets.length > 0) {
    const { data: barData, error: barErr } = await admin.database
      .from("market_bars")
      .select("instrument_id,timeframe,ts,o,h,l,c,v")
      .eq("timeframe", "1m")
      .in("ts", buckets);
    if (barErr) {
      return json(500, { error: barErr.message });
    }
    for (const row of asRows<{
      instrument_id: string;
      ts: string;
      o: number | string;
      h: number | string;
      l: number | string;
      c: number | string;
      v: number | string;
    }>(barData)) {
      minuteBars.push({
        instrument_id: row.instrument_id,
        timeframe: "1m",
        ts: row.ts,
        o: Number(row.o),
        h: Number(row.h),
        l: Number(row.l),
        c: Number(row.c),
        v: Number(row.v),
      });
    }
  }

  const nowIso = new Date().toISOString();
  const result = runFeedInvocation({
    nowIso,
    intervalSeconds,
    calendar,
    flags,
    instruments,
    quotes,
    minuteBars,
  });

  if (result.quotes.length > 0) {
    const { error } = await admin.database.from("quotes_latest").upsert(
      result.quotes.map((q) => ({
        instrument_id: q.instrument_id,
        bid: q.bid,
        ask: q.ask,
        last: q.last,
        prev_close: q.prev_close,
        volume: q.volume,
        ts: q.ts,
      })),
      { onConflict: "instrument_id" },
    );
    if (error) {
      return json(500, { error: error.message });
    }
  }

  if (result.barsToUpsert.length > 0) {
    const { error } = await admin.database.from("market_bars").upsert(
      result.barsToUpsert.map((b) => ({
        instrument_id: b.instrument_id,
        timeframe: "1m",
        ts: b.ts,
        o: b.o,
        h: b.h,
        l: b.l,
        c: b.c,
        v: b.v,
      })),
      { onConflict: "instrument_id,timeframe,ts" },
    );
    if (error) {
      return json(500, { error: error.message });
    }
  }

  const symbolById = new Map(instruments.map((i) => [i.id, i.symbol]));
  for (const snapshot of result.publishes) {
    const payload = {
      ts: snapshot[0]?.ts ?? nowIso,
      ticks: snapshot.map((q) => ({
        ...q,
        symbol: symbolById.get(q.instrument_id),
      })),
    };
    const { error } = await admin.database.rpc("publish_quotes_batch", { payload });
    if (error) {
      return json(500, { error: error.message });
    }
  }

  if (result.consumeForcePrice) {
    await admin.database
      .from("feature_flags")
      .delete()
      .eq("key", "feed.force_price")
      .is("user_id", null);
  }

  await admin.database.from("audit_log").insert([
    {
      action: "market-tick",
      entity_type: "quotes_latest",
      payload: {
        session: result.session,
        ticksApplied: result.ticksApplied,
        published: result.publishes.length,
        paused: flags.paused,
        consumeForcePrice: result.consumeForcePrice,
      },
    },
  ]);

  return json(200, {
    session: result.session,
    ticksApplied: result.ticksApplied,
    published: result.publishes.length,
    paused: flags.paused,
  });
}
