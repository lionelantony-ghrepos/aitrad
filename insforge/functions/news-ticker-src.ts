/**
 * Orchestration source for `news-ticker`. Bundle to `news-ticker.ts` with esbuild
 * (`--external:npm:@insforge/sdk`) before deploy.
 */
import { createAdminClient } from "npm:@insforge/sdk";
import type { MockInstrument } from "../../packages/schemas/src/entities.ts";
import { parseFeedControls } from "../../packages/mock-data/src/feed.ts";
import {
  parseNewsTemplatesJson,
  planNewsTickerInvocation,
} from "../../packages/mock-data/src/news.ts";
import templatesJson from "../../mock_data/news-templates.json" with { type: "json" };

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

function readElapsed(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
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

  const intervalRaw =
    Deno.env.get("NEWS_TICKER_INTERVAL_SECONDS") ?? Deno.env.get("MARKET_TICK_INTERVAL_SECONDS");
  const intervalSeconds = intervalRaw === undefined ? 60 : Number(intervalRaw);
  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    return json(500, { error: "INTERVAL_INVALID" });
  }

  const admin = createAdminClient({
    baseUrl: Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL"),
    apiKey: expected,
  });

  const templates = parseNewsTemplatesJson(templatesJson);

  const { data: flagData, error: flagErr } = await admin.database
    .from("feature_flags")
    .select("id,key,value")
    .is("user_id", null);
  if (flagErr) {
    return json(500, { error: flagErr.message });
  }
  const flagRows = asRows<{ key: string; value: unknown }>(flagData)
    .map(flagValue)
    .filter((row): row is { key: string; value: unknown } => row !== null);
  const flags = parseFeedControls(flagRows);
  const elapsedRow = flagRows.find((row) => row.key === "news.sim_elapsed_sec");
  const simElapsedSec = readElapsed(elapsedRow?.value);

  const { data: instData, error: instErr } = await admin.database
    .from("instruments")
    .select(
      "symbol,name,exchange,sector,industry,status,currency,tick_size,lot_size,base_price,market_cap_band,beta_class,avg_volume,avg_volume_band",
    )
    .eq("status", "active");
  if (instErr) {
    return json(500, { error: instErr.message });
  }

  const universe: MockInstrument[] = asRows<{
    symbol: string;
    name: string;
    exchange: string;
    sector: string | null;
    industry: string | null;
    status: "active" | "halted" | "delisted";
    currency: string;
    tick_size: number | string;
    lot_size: number | string;
    base_price: number | string | null;
    market_cap_band: MockInstrument["market_cap_band"] | null;
    beta_class: MockInstrument["beta_class"] | null;
    avg_volume: number | string | null;
    avg_volume_band: MockInstrument["avg_volume_band"] | null;
  }>(instData)
    .filter(
      (row) =>
        row.market_cap_band !== null &&
        row.beta_class !== null &&
        row.avg_volume_band !== null &&
        row.sector !== null &&
        row.industry !== null &&
        row.base_price !== null,
    )
    .map((row) => ({
      symbol: row.symbol,
      name: row.name,
      exchange: row.exchange,
      sector: row.sector ?? "Unknown",
      industry: row.industry ?? "Unknown",
      status: row.status,
      currency: row.currency,
      tick_size: Number(row.tick_size),
      lot_size: Number(row.lot_size),
      base_price: Number(row.base_price),
      market_cap_band: row.market_cap_band as MockInstrument["market_cap_band"],
      beta_class: row.beta_class as MockInstrument["beta_class"],
      avg_volume: Number(row.avg_volume ?? 1),
      avg_volume_band: row.avg_volume_band as MockInstrument["avg_volume_band"],
    }));

  const plan = planNewsTickerInvocation({
    intervalSeconds,
    speed: flags.speed,
    paused: flags.paused,
    simElapsedSec,
    universe,
    templates,
    nowIso: new Date().toISOString(),
  });

  let alerting: { ok: boolean } | { ok: false; error: string } = { ok: true };
  if (plan.items.length > 0) {
    const { error } = await admin.database.from("news_items").upsert(
      plan.items.map((item) => ({
        id: item.id,
        ts: item.ts,
        headline: item.headline,
        body: item.body,
        source: item.source,
        symbols: item.symbols,
        sector: item.sector,
        sentiment: item.sentiment,
        event_type: item.event_type,
      })),
      { onConflict: "id" },
    );
    if (error) {
      return json(500, { error: error.message });
    }
    const payload = { ts: plan.items[0]?.ts, items: plan.items };
    const published = await admin.database.rpc("publish_news_batch", { payload });
    if (published.error) {
      return json(500, { error: published.error.message });
    }
    const origin = (
      Deno.env.get("INSFORGE_INTERNAL_URL") ??
      Deno.env.get("INSFORGE_BASE_URL") ??
      ""
    ).replace(/\/+$/, "");
    try {
      const alertRes = await fetch(`${origin}/functions/alert-runner`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${expected}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ news: plan.items }),
      });
      if (!alertRes.ok) {
        alerting = { ok: false, error: `ALERT_RUNNER_${alertRes.status}` };
      }
    } catch (error) {
      alerting = {
        ok: false,
        error: error instanceof Error ? error.message : "ALERT_RUNNER_UNAVAILABLE",
      };
    }
    try {
      await fetch(`${origin}/functions/embed-worker`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${expected}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          op: "cycle",
          news_ids: plan.items.map((item) => item.id),
        }),
      });
    } catch {
      // Embed failures are retried / dead-lettered by embed-worker; do not fail the ticker.
    }
  }

  if (elapsedRow) {
    const { error } = await admin.database
      .from("feature_flags")
      .update({ value: plan.nextSimElapsedSec })
      .eq("key", "news.sim_elapsed_sec")
      .is("user_id", null);
    if (error) {
      return json(500, { error: error.message });
    }
  }

  await admin.database.from("audit_log").insert([
    {
      action: "news-ticker",
      entity_type: "news_items",
      payload: {
        published: plan.items.length,
        bursts: plan.bursts,
        paused: flags.paused,
        nextSimElapsedSec: plan.nextSimElapsedSec,
        alerting,
      },
    },
  ]);

  return json(200, {
    published: plan.items.length,
    bursts: plan.bursts,
    paused: flags.paused,
    nextSimElapsedSec: plan.nextSimElapsedSec,
    alerting,
  });
}
