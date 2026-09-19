/**
 * Shared Yahoo-shaped market snapshot helpers.
 * Live HTTP is freeze/refresh only. seed:all / overlay default read committed JSON.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const PRIORITY = Object.freeze([
  "AAPL",
  "MSFT",
  "NVDA",
  "AMD",
  "AVGO",
  "TSM",
  "PLTR",
  "SNOW",
  "DDOG",
  "NET",
  "JPM",
  "XOM",
  "SPY",
  "QQQ",
  "TSLA",
  "AMZN",
  "GOOGL",
  "META",
]);

export const MINUTE_SYMBOLS = Object.freeze(PRIORITY.slice(0, 8));

export const DAILY_RANGE = "5d";
export const DAILY_INTERVAL = "1d";
export const MINUTE_RANGE = "1d";
export const MINUTE_INTERVAL = "1m";
export const NEWS_PER_SYMBOL = 4;
export const SNAPSHOT_STATUS_CAPTURED = "captured";
export const SNAPSHOT_STATUS_NOT_CAPTURED = "not_captured";

const USER_AGENT = "Mozilla/5.0 MeridianMarketFreeze/1.0";
const FETCH_TIMEOUT_MS = 20_000;

export function snapshotDir(repoRoot) {
  return path.join(repoRoot, "mock_data", "market-snapshot");
}

/** Meridian seed symbol → Yahoo chart ticker when they diverge. */
export const YAHOO_SYMBOL_ALIASES = Object.freeze({ SQ: "XYZ" });

export function yahooSymbolFor(symbol) {
  const aliased = YAHOO_SYMBOL_ALIASES[symbol] ?? symbol;
  return String(aliased).replaceAll(".", "-");
}

export function roundToTick(value, tick) {
  const t = Number(tick) || 0.01;
  const decimals = Math.max(0, (String(t).split(".")[1] ?? "").length);
  const rounded = Math.round(value / t) * t;
  return Number(rounded.toFixed(decimals));
}

export function classifyEvent(headline) {
  const h = headline.toLowerCase();
  if (/\bearnings\b|\beps\b|\brevenue\b|\bbeat\b|\bmiss\b/.test(h)) return "earnings";
  if (/\bupgrade\b|\bdowngrade\b|\banalyst\b|\bprice target\b|\boverweight\b/.test(h)) {
    return "analyst";
  }
  if (/\bfed\b|\binflation\b|\btariff\b|\bjobs\b|\btreasury\b|\bmacro\b/.test(h)) return "macro";
  if (/\bsec\b|\bregulator\b|\blawsuit\b|\bantitrust\b|\bfine\b/.test(h)) return "regulatory";
  if (/\bmerge\b|\bacqui\b|\bdeal\b|\btakeover\b|\bbid for\b/.test(h)) return "mna";
  return "product";
}

export function sentimentFromHeadline(headline) {
  const h = headline.toLowerCase();
  let s = 0;
  if (/\bbeat\b|\bsurge\b|\brally\b|\bgain\b|\brecord\b|\bupgrade\b/.test(h)) s += 0.35;
  if (/\bmiss\b|\bdrop\b|\bfall\b|\bcut\b|\bdowngrade\b|\bprobe\b|\bfine\b/.test(h)) s -= 0.35;
  return Math.max(-1, Math.min(1, Math.round(s * 1000) / 1000));
}

export function originalBody(symbol, headline) {
  return [
    `${symbol}: public-market headline captured for the Meridian paper terminal — "${headline}".`,
    "This body is an original two-sentence summary for seed overlay, not a reprint of the source article. Treat it as delayed public information for paper trading only.",
  ].join(" ");
}

export function stableUuid(input) {
  const hex = createHash("sha1").update(input).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  const variant = Number.parseInt(hex[16] ?? "0", 16);
  hex[16] = ((variant & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

export function hashEmbedding(newsId) {
  let seed = 0;
  for (let i = 0; i < newsId.length; i += 1) {
    seed = (Math.imul(seed, 31) + newsId.charCodeAt(i)) | 0;
  }
  const dims = [];
  for (let i = 0; i < 1536; i += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    dims.push(((seed >>> 0) % 1000) / 1000 - 0.5);
  }
  return dims;
}

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function defaultLog(line) {
  process.stdout.write(`${line}\n`);
}

export function loadInstrumentUniverse(repoRoot) {
  const file = path.join(repoRoot, "mock_data", "instruments.json");
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error("INSTRUMENTS_JSON_NOT_ARRAY");
  }
  return parsed.map((row) => ({
    symbol: String(row.symbol),
    tick_size: Number(row.tick_size) || 0.01,
    sector: row.sector ? String(row.sector) : null,
  }));
}

export function loadAdmin(repoRoot) {
  const envPath = path.join(repoRoot, ".env");
  let url = process.env.INSFORGE_URL;
  let key = process.env.INSFORGE_API_KEY;
  try {
    const env = readFileSync(envPath, "utf8");
    for (const line of env.split(/\r?\n/)) {
      const m = line.match(/^(INSFORGE_URL|INSFORGE_API_KEY)=(.*)$/);
      if (!m) continue;
      const val = m[2].trim();
      if (m[1] === "INSFORGE_URL") url = url || val;
      if (m[1] === "INSFORGE_API_KEY") key = key || val;
    }
  } catch {
    /* optional */
  }
  if (!url || !key) {
    const pj = JSON.parse(readFileSync(path.join(repoRoot, ".insforge", "project.json"), "utf8"));
    url = url || pj.oss_host;
    key = key || pj.api_key;
  }
  if (!url || !key) {
    throw new Error("Missing INSFORGE_URL / INSFORGE_API_KEY");
  }
  return { url: url.replace(/\/+$/, ""), key };
}

export async function records(admin, method, table, { query, body } = {}) {
  const u = new URL(`${admin.url}/api/database/records/${table}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) u.searchParams.set(k, String(v));
    }
  }
  const headers = {
    Authorization: `Bearer ${admin.key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  const res = await fetch(u, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  if (!res.ok) {
    throw new Error(`${method} ${table} ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function fetchText(url, { retries = 3 } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`http ${res.status}`);
        await sleep(500 * 2 ** attempt);
        continue;
      }
      const text = await res.text();
      return { ok: res.ok, status: res.status, text };
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      await sleep(500 * 2 ** attempt);
    }
  }
  throw lastErr ?? new Error(`fetch failed ${url}`);
}

export async function yahooChart(symbol, range, interval) {
  const ysym = yahooSymbolFor(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ysym)}?range=${range}&interval=${interval}`;
  const { ok, status, text } = await fetchText(url);
  if (!ok) {
    throw new Error(`yahoo ${symbol} ${status}`);
  }
  const data = JSON.parse(text);
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error(`yahoo empty ${symbol}`);
  }
  return result;
}

function parseRssItems(xml, limit) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) && items.length < limit) {
    const block = m[1];
    const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
      block.match(/<title>(.*?)<\/title>/))?.[1];
    const pub = (block.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1];
    if (!title) continue;
    items.push({
      headline: title.replace(/\s+/g, " ").trim(),
      ts: pub ? new Date(pub).toISOString() : new Date().toISOString(),
      source: "Yahoo Finance RSS",
    });
  }
  return items;
}

function parseSearchNews(payload, limit) {
  const news = Array.isArray(payload?.news) ? payload.news : [];
  const items = [];
  for (const row of news) {
    if (items.length >= limit) break;
    const title = String(row?.title ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (!title) continue;
    const published = Number(row?.providerPublishTime);
    const ts =
      Number.isFinite(published) && published > 0
        ? new Date(published * 1000).toISOString()
        : new Date().toISOString();
    const yahooId =
      typeof row?.uuid === "string" && /^[0-9a-f-]{36}$/i.test(row.uuid) ? row.uuid : null;
    items.push({
      headline: title,
      ts,
      source: "Yahoo Finance news",
      yahooId,
    });
  }
  return items;
}

/** Headlines only (RSS titles, else search news titles). Never fetches article HTML. */
export async function yahooHeadlines(symbol, { limit = NEWS_PER_SYMBOL } = {}) {
  const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(yahooSymbolFor(symbol))}&region=US&lang=en-US`;
  try {
    const rss = await fetchText(rssUrl, { retries: 2 });
    if (rss.ok) {
      const items = parseRssItems(rss.text, limit);
      if (items.length > 0) return items;
    }
  } catch {
    /* fall through to search news titles */
  }
  const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(yahooSymbolFor(symbol))}&newsCount=${limit}&quotesCount=0`;
  const { ok, text } = await fetchText(searchUrl);
  if (!ok) return [];
  try {
    return parseSearchNews(JSON.parse(text), limit);
  } catch {
    return [];
  }
}

export function mapQuoteFromChart(chart, tick) {
  const meta = chart.meta ?? {};
  const last = Number(meta.regularMarketPrice);
  const prev = Number(meta.chartPreviousClose ?? meta.previousClose ?? last);
  const volume = Number(meta.regularMarketVolume ?? 0);
  if (!Number.isFinite(last) || last <= 0) {
    throw new Error("bad last");
  }
  const lastR = roundToTick(last, tick);
  const prevR = roundToTick(prev > 0 ? prev : last, tick);
  const bid = roundToTick(Math.max(tick, lastR - tick), tick);
  const ask = roundToTick(lastR + tick, tick);
  return {
    last: lastR,
    prev_close: prevR,
    bid: Math.min(bid, lastR),
    ask: Math.max(ask, lastR),
    volume: Math.max(0, volume),
  };
}

export function mapDailyBarFromChart(chart, tick, fallbackLast) {
  const tsArr = chart.timestamp ?? [];
  const q = chart.indicators?.quote?.[0] ?? {};
  const lastIdx = tsArr.length - 1;
  if (lastIdx < 0) return null;
  const o = roundToTick(Number(q.open?.[lastIdx] ?? fallbackLast), tick);
  const h = roundToTick(Number(q.high?.[lastIdx] ?? fallbackLast), tick);
  const l = roundToTick(Number(q.low?.[lastIdx] ?? fallbackLast), tick);
  const c = roundToTick(Number(q.close?.[lastIdx] ?? fallbackLast), tick);
  const v = Number(q.volume?.[lastIdx] ?? 0);
  if (![o, h, l, c].every((n) => Number.isFinite(n) && n > 0)) return null;
  const low = Math.min(l, o, c);
  const high = Math.max(h, o, c);
  return {
    ts: new Date(tsArr[lastIdx] * 1000).toISOString(),
    o,
    h: high,
    l: Math.max(tick, low),
    c,
    v: Math.max(0, v),
  };
}

export function mapMinuteBarsFromChart(chart, tick) {
  const tsArr = chart.timestamp ?? [];
  const q = chart.indicators?.quote?.[0] ?? {};
  const rows = [];
  for (let i = 0; i < tsArr.length; i += 1) {
    const o = Number(q.open?.[i]);
    const h = Number(q.high?.[i]);
    const l = Number(q.low?.[i]);
    const c = Number(q.close?.[i]);
    const v = Number(q.volume?.[i] ?? 0);
    if (![o, h, l, c].every((n) => Number.isFinite(n) && n > 0)) continue;
    const oo = roundToTick(o, tick);
    const cc = roundToTick(c, tick);
    const ll = roundToTick(Math.min(l, oo, cc), tick);
    const hh = roundToTick(Math.max(h, oo, cc), tick);
    rows.push({
      ts: new Date(tsArr[i] * 1000).toISOString(),
      o: oo,
      h: hh,
      l: Math.max(tick, ll),
      c: cc,
      v: Math.max(0, v),
    });
  }
  return rows;
}

export function mapFundamentalsRanges(chart, tick) {
  const meta = chart.meta ?? {};
  const w52h = Number(meta.fiftyTwoWeekHigh);
  const w52l = Number(meta.fiftyTwoWeekLow);
  if (!Number.isFinite(w52h) || !Number.isFinite(w52l) || w52h <= 0 || w52l <= 0) {
    return null;
  }
  return {
    week52_high: roundToTick(w52h, tick),
    week52_low: roundToTick(w52l, tick),
  };
}

export function mapNewsRecord(symbol, item) {
  const headline = item.headline.slice(0, 280);
  const id = item.yahooId ?? stableUuid(`${symbol}|${item.ts}|${headline}`);
  return {
    id,
    symbol,
    ts: item.ts,
    headline,
    body: originalBody(symbol, headline),
    source: item.source,
    event_type: classifyEvent(headline),
    sentiment: sentimentFromHeadline(headline),
  };
}

export function emptySnapshot({ asOfUtc, reason } = {}) {
  return {
    manifest: {
      status: SNAPSHOT_STATUS_NOT_CAPTURED,
      asOfUtc: asOfUtc ?? null,
      source: "yahoo-finance-v8-chart-and-headlines",
      daily: { range: DAILY_RANGE, interval: DAILY_INTERVAL, stored: "latest bar only" },
      intraday: {
        range: MINUTE_RANGE,
        interval: MINUTE_INTERVAL,
        symbols: [...MINUTE_SYMBOLS],
      },
      priority: [...PRIORITY],
      universe: [],
      counts: {
        quotes: 0,
        dailyBars: 0,
        minuteBars: 0,
        fundamentalsRanges: 0,
        news: 0,
      },
      failedSymbols: [],
      reason: reason ?? "not_captured",
    },
    quotes: [],
    dailyBars: [],
    minuteBars: [],
    fundamentalsRanges: [],
    news: [],
  };
}

export function isSnapshotCaptured(manifest) {
  return manifest?.status === SNAPSHOT_STATUS_CAPTURED && Number(manifest?.counts?.quotes) > 0;
}

export function renderSourceMarkdown(snapshot) {
  const m = snapshot.manifest;
  const captured = isSnapshotCaptured(m);
  const asOf = m.asOfUtc ?? "(not captured)";
  const failed = (m.failedSymbols ?? []).join(", ") || "(none)";
  const universe = (m.universe ?? []).join(", ") || "(empty)";
  const todo = captured
    ? ""
    : `
## TODO — capture on lja

This tree was committed **without** Yahoo prices (cloud freeze returned no quotes, or freeze has not been run). PE: on \`lja\`, run \`pnpm market:freeze\`, commit the JSON artifacts + this file, and push a follow-up. **Do not invent fake prices labeled as Yahoo.** Until then \`pnpm seed:all\` keeps the deterministic GBM universe and skips overlay.
`;
  return `# Frozen market snapshot (Path A offline replay)

- **As-of (UTC):** ${asOf}
- **Status:** ${m.status}
- **Source:** Yahoo Finance v8 chart API (quotes / OHLC / 52-week meta) plus public headlines (RSS titles when available, otherwise Yahoo search news titles). Mapped into Meridian seed tables; this is not a vendor dump.
- **Tests / CI / \`pnpm seed:all\`:** replay this directory **offline**. Gates must not hit Yahoo (ToS + flake). Live HTTP is \`pnpm market:freeze\` (or \`overlay-live-market.mjs --live\`) only.

## Symbol universe

Priority (news; first 8 also get 1m bars): ${PRIORITY.join(" ")}

Quotes / latest daily bar / 52-week ranges: seeded instruments from \`mock_data/instruments.json\` that Yahoo returned.

Ticker aliases (Meridian → Yahoo): ${
    Object.entries(YAHOO_SYMBOL_ALIASES)
      .map(([from, to]) => `${from}→${to}`)
      .join(", ") || "(none)"
  }.

Captured symbols (${m.universe?.length ?? 0}): ${universe}

Failed / skipped symbols: ${failed}

## Data ranges / intervals

| Dataset | Yahoo range | interval | Stored |
| --- | --- | --- | --- |
| quotes + latest daily OHLC | ${DAILY_RANGE} | ${DAILY_INTERVAL} | last, prev_close, bid/ask (±1 tick), volume, latest 1d bar |
| 52-week high/low | chart meta | — | \`fundamentals.metrics.ranges.week52_*\` |
| 1m bars | ${MINUTE_RANGE} | ${MINUTE_INTERVAL} | ${MINUTE_SYMBOLS.join(", ")} |
| news | RSS or search titles | — | up to ${NEWS_PER_SYMBOL} headlines per priority symbol |

Counts: quotes=${m.counts?.quotes ?? 0} dailyBars=${m.counts?.dailyBars ?? 0} minuteBars=${m.counts?.minuteBars ?? 0} fundamentalsRanges=${m.counts?.fundamentalsRanges ?? 0} news=${m.counts?.news ?? 0}.

## News bodies

Headlines are public titles. **Bodies are original two-sentence summaries** written for the paper terminal — not reprints of source articles. Treat as delayed public information for paper trading only.

## Refresh (live Yahoo, not CI)

\`\`\`bash
pnpm market:freeze
git add mock_data/market-snapshot
git commit -m "chore: refresh frozen market snapshot"
\`\`\`

Then Path A / Docker: \`pnpm seed:all\` applies the snapshot offline. Optional live DB apply without rewriting fixtures: \`node scripts/overlay-live-market.mjs --live\`.
${todo}`;
}

export function writeSnapshot(dir, snapshot) {
  mkdirSync(dir, { recursive: true });
  const files = {
    "quotes.json": snapshot.quotes,
    "daily-bars.json": snapshot.dailyBars,
    "minute-bars.json": snapshot.minuteBars,
    "fundamentals-ranges.json": snapshot.fundamentalsRanges,
    "news.json": snapshot.news,
  };
  for (const [name, data] of Object.entries(files)) {
    writeFileSync(path.join(dir, name), `${JSON.stringify(data, null, 2)}\n`);
  }
  writeFileSync(path.join(dir, "SOURCE.md"), renderSourceMarkdown(snapshot));
  writeFileSync(path.join(dir, "manifest.json"), `${JSON.stringify(snapshot.manifest, null, 2)}\n`);
}

function readJsonArray(file) {
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  return Array.isArray(parsed) ? parsed : [];
}

export function readSnapshot(dir) {
  const manifestPath = path.join(dir, "manifest.json");
  if (!existsSync(manifestPath)) {
    return emptySnapshot({ reason: "manifest.json missing" });
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  return {
    manifest,
    quotes: readJsonArray(path.join(dir, "quotes.json")),
    dailyBars: readJsonArray(path.join(dir, "daily-bars.json")),
    minuteBars: readJsonArray(path.join(dir, "minute-bars.json")),
    fundamentalsRanges: readJsonArray(path.join(dir, "fundamentals-ranges.json")),
    news: readJsonArray(path.join(dir, "news.json")),
  };
}

export async function captureSnapshot({
  universe,
  log = defaultLog,
  fetchChart = yahooChart,
  fetchHeadlines = yahooHeadlines,
  delayMs = 80,
} = {}) {
  const asOfUtc = new Date().toISOString();
  const quotes = [];
  const dailyBars = [];
  const minuteBars = [];
  const fundamentalsRanges = [];
  const news = [];
  const failedSymbols = [];
  const capturedSymbols = [];

  for (const row of universe) {
    const symbol = row.symbol;
    const tick = Number(row.tick_size) || 0.01;
    try {
      const chart = await fetchChart(symbol, DAILY_RANGE, DAILY_INTERVAL);
      const quote = mapQuoteFromChart(chart, tick);
      quotes.push({
        symbol,
        ...quote,
        ts: asOfUtc,
      });
      const bar = mapDailyBarFromChart(chart, tick, quote.last);
      if (bar) {
        dailyBars.push({ symbol, ...bar });
      }
      const ranges = mapFundamentalsRanges(chart, tick);
      if (ranges) {
        fundamentalsRanges.push({ symbol, ...ranges });
      }
      capturedSymbols.push(symbol);
    } catch (err) {
      failedSymbols.push(symbol);
      log(`  skip ${symbol}: ${err instanceof Error ? err.message : err}`);
    }
    await sleep(delayMs);
  }

  const newsSymbols = PRIORITY.filter((s) => universe.some((row) => row.symbol === s));
  for (const symbol of newsSymbols) {
    let items = [];
    try {
      items = await fetchHeadlines(symbol);
    } catch {
      items = [];
    }
    for (const item of items) {
      news.push(mapNewsRecord(symbol, item));
    }
    await sleep(Math.max(delayMs, 120));
  }

  for (const symbol of MINUTE_SYMBOLS) {
    const inst = universe.find((row) => row.symbol === symbol);
    if (!inst) continue;
    const tick = Number(inst.tick_size) || 0.01;
    try {
      const chart = await fetchChart(symbol, MINUTE_RANGE, MINUTE_INTERVAL);
      const rows = mapMinuteBarsFromChart(chart, tick);
      for (const bar of rows) {
        minuteBars.push({ symbol, ...bar });
      }
      log(`  1m ${symbol} bars=${rows.length}`);
    } catch (err) {
      log(`  1m skip ${symbol}: ${err instanceof Error ? err.message : err}`);
    }
    await sleep(Math.max(delayMs, 150));
  }

  const status = quotes.length > 0 ? SNAPSHOT_STATUS_CAPTURED : SNAPSHOT_STATUS_NOT_CAPTURED;
  return {
    manifest: {
      status,
      asOfUtc,
      source: "yahoo-finance-v8-chart-and-headlines",
      daily: { range: DAILY_RANGE, interval: DAILY_INTERVAL, stored: "latest bar only" },
      intraday: {
        range: MINUTE_RANGE,
        interval: MINUTE_INTERVAL,
        symbols: [...MINUTE_SYMBOLS],
      },
      priority: [...PRIORITY],
      universe: capturedSymbols,
      counts: {
        quotes: quotes.length,
        dailyBars: dailyBars.length,
        minuteBars: minuteBars.length,
        fundamentalsRanges: fundamentalsRanges.length,
        news: news.length,
      },
      failedSymbols,
      reason: status === SNAPSHOT_STATUS_CAPTURED ? null : "yahoo returned no quotes",
    },
    quotes,
    dailyBars,
    minuteBars,
    fundamentalsRanges,
    news,
  };
}

function asInstrumentRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

async function upsertBar(admin, bar) {
  try {
    await records(admin, "POST", "market_bars", { body: [bar] });
  } catch {
    await records(admin, "PATCH", "market_bars", {
      query: {
        instrument_id: `eq.${bar.instrument_id}`,
        timeframe: `eq.${bar.timeframe}`,
        ts: `eq.${bar.ts}`,
      },
      body: { o: bar.o, h: bar.h, l: bar.l, c: bar.c, v: bar.v },
    });
  }
}

export async function applySnapshot(admin, snapshot, { log = defaultLog } = {}) {
  if (!isSnapshotCaptured(snapshot.manifest)) {
    log("overlay: frozen snapshot not captured; skipping (GBM seed unchanged)");
    return { skipped: true, quotes: 0, dailyBars: 0, minuteBars: 0, fundamentals: 0, news: 0 };
  }

  let instruments = await records(admin, "GET", "instruments", {
    query: { select: "id,symbol,tick_size,sector", limit: "500" },
  });
  instruments = asInstrumentRows(instruments);
  log(`overlay: instruments=${instruments.length}`);
  if (instruments.length === 0) {
    throw new Error("overlay: universe empty — run `pnpm seed:all` first");
  }
  const bySymbol = new Map(instruments.map((r) => [r.symbol, r]));

  let quotesOk = 0;
  for (const row of snapshot.quotes) {
    const inst = bySymbol.get(row.symbol);
    if (!inst) continue;
    await records(admin, "PATCH", "quotes_latest", {
      query: { instrument_id: `eq.${inst.id}` },
      body: {
        last: row.last,
        prev_close: row.prev_close,
        bid: row.bid,
        ask: row.ask,
        volume: row.volume,
        ts: row.ts,
      },
    });
    quotesOk += 1;
  }

  let dailyOk = 0;
  for (const row of snapshot.dailyBars) {
    const inst = bySymbol.get(row.symbol);
    if (!inst) continue;
    await upsertBar(admin, {
      instrument_id: inst.id,
      timeframe: "1d",
      ts: row.ts,
      o: row.o,
      h: row.h,
      l: row.l,
      c: row.c,
      v: row.v,
    });
    dailyOk += 1;
  }

  let fundOk = 0;
  for (const row of snapshot.fundamentalsRanges) {
    const inst = bySymbol.get(row.symbol);
    if (!inst) continue;
    const existing = await records(admin, "GET", "fundamentals", {
      query: { instrument_id: `eq.${inst.id}`, select: "metrics", limit: "1" },
    });
    const rec = Array.isArray(existing) ? existing[0] : existing?.[0];
    if (!rec?.metrics) continue;
    const metrics = { ...rec.metrics, ranges: { ...rec.metrics.ranges } };
    metrics.ranges.week52_high = row.week52_high;
    metrics.ranges.week52_low = row.week52_low;
    await records(admin, "PATCH", "fundamentals", {
      query: { instrument_id: `eq.${inst.id}` },
      body: { metrics, updated_at: new Date().toISOString() },
    });
    fundOk += 1;
  }

  let newsOk = 0;
  for (const item of snapshot.news) {
    const inst = bySymbol.get(item.symbol);
    const body = [
      {
        id: item.id,
        ts: item.ts,
        headline: item.headline,
        body: item.body,
        source: item.source,
        symbols: [item.symbol],
        sector: inst?.sector ?? null,
        sentiment: item.sentiment,
        event_type: item.event_type,
      },
    ];
    try {
      await records(admin, "POST", "news_items", { body });
    } catch {
      try {
        await records(admin, "PATCH", "news_items", {
          query: { id: `eq.${item.id}` },
          body: body[0],
        });
      } catch (err) {
        log(`  news skip ${item.symbol}: ${err instanceof Error ? err.message : err}`);
        continue;
      }
    }
    const embedding = hashEmbedding(item.id);
    try {
      await records(admin, "POST", "news_embeddings", {
        body: [
          {
            news_id: item.id,
            embedding,
            embedding_model: "local-hash-overlay",
          },
        ],
      });
    } catch {
      /* embedding already present on re-seed */
    }
    newsOk += 1;
  }

  let minuteSymbols = 0;
  const minuteBySymbol = new Map();
  for (const bar of snapshot.minuteBars) {
    const list = minuteBySymbol.get(bar.symbol) ?? [];
    list.push(bar);
    minuteBySymbol.set(bar.symbol, list);
  }
  const BATCH = 80;
  for (const [symbol, rows] of minuteBySymbol) {
    const inst = bySymbol.get(symbol);
    if (!inst) continue;
    const mapped = rows.map((bar) => ({
      instrument_id: inst.id,
      timeframe: "1m",
      ts: bar.ts,
      o: bar.o,
      h: bar.h,
      l: bar.l,
      c: bar.c,
      v: bar.v,
    }));
    for (let i = 0; i < mapped.length; i += BATCH) {
      const chunk = mapped.slice(i, i + BATCH);
      try {
        await records(admin, "POST", "market_bars", { body: chunk });
      } catch {
        for (const bar of chunk) {
          try {
            await records(admin, "PATCH", "market_bars", {
              query: {
                instrument_id: `eq.${bar.instrument_id}`,
                timeframe: "eq.1m",
                ts: `eq.${bar.ts}`,
              },
              body: { o: bar.o, h: bar.h, l: bar.l, c: bar.c, v: bar.v },
            });
          } catch {
            /* skip bad minute */
          }
        }
      }
    }
    minuteSymbols += 1;
    log(`  1m ${symbol} bars=${mapped.length}`);
  }

  log(
    `overlay: quotes=${quotesOk} daily_bars=${dailyOk} fundamentals=${fundOk} news=${newsOk} minute_symbols=${minuteSymbols}`,
  );
  return {
    skipped: false,
    quotes: quotesOk,
    dailyBars: dailyOk,
    minuteBars: snapshot.minuteBars.length,
    fundamentals: fundOk,
    news: newsOk,
  };
}
