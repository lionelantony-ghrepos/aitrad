/**
 * One-off local overlay: Yahoo Finance v8 quotes/history + RSS headlines
 * mapped onto the existing Meridian seed tables. Does not print secrets.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function loadAdmin() {
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

function roundToTick(value, tick) {
  const t = Number(tick) || 0.01;
  return Math.round(value / t) * t;
}

async function records(admin, method, table, { query, body } = {}) {
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
    signal: AbortSignal.timeout(20_000),
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

async function yahooChart(symbol, range, interval) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 MeridianLocalOverlay/1.0" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`yahoo ${symbol} ${res.status}`);
  }
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error(`yahoo empty ${symbol}`);
  }
  return result;
}

function classifyEvent(headline) {
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

function sentimentFromHeadline(headline) {
  const h = headline.toLowerCase();
  let s = 0;
  if (/\bbeat\b|\bsurge\b|\brally\b|\bgain\b|\brecord\b|\bupgrade\b/.test(h)) s += 0.35;
  if (/\bmiss\b|\bdrop\b|\bfall\b|\bcut\b|\bdowngrade\b|\bprobe\b|\bfine\b/.test(h)) s -= 0.35;
  return Math.max(-1, Math.min(1, Math.round(s * 1000) / 1000));
}

function originalBody(symbol, headline) {
  return [
    `${symbol}: public-market headline captured for the Meridian paper terminal — "${headline}".`,
    "This body is an original two-sentence summary for seed overlay, not a reprint of the source article. Treat it as delayed public information for paper trading only.",
  ].join(" ");
}

async function yahooRss(symbol) {
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 MeridianLocalOverlay/1.0" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return [];
  const xml = await res.text();
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) && items.length < 4) {
    const block = m[1];
    const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
      block.match(/<title>(.*?)<\/title>/))?.[1];
    const pub = (block.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1];
    if (!title) continue;
    items.push({
      headline: title.replace(/\s+/g, " ").trim(),
      ts: pub ? new Date(pub).toISOString() : new Date().toISOString(),
    });
  }
  return items;
}

function hashEmbedding(newsId) {
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

const PRIORITY = [
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
];

async function main() {
  const admin = loadAdmin();
  process.stdout.write(`overlay: targeting ${admin.url}\n`);

  let instruments = await records(admin, "GET", "instruments", {
    query: { select: "id,symbol,tick_size,sector", limit: "500" },
  });
  if (!Array.isArray(instruments)) {
    instruments = instruments?.data ?? [];
  }
  process.stdout.write(`overlay: instruments=${instruments.length}\n`);
  if (instruments.length === 0) {
    process.stderr.write(
      "overlay: universe empty — run `pnpm seed:all` from the WSL clone first.\n",
    );
    process.exit(2);
  }

  const bySymbol = new Map(instruments.map((r) => [r.symbol, r]));
  let quotesOk = 0;
  let quotesFail = 0;
  let barsOk = 0;
  let fundOk = 0;

  for (const row of instruments) {
    const symbol = row.symbol;
    try {
      const chart = await yahooChart(symbol, "5d", "1d");
      const meta = chart.meta ?? {};
      const last = Number(meta.regularMarketPrice);
      const prev = Number(meta.chartPreviousClose ?? meta.previousClose ?? last);
      const volume = Number(meta.regularMarketVolume ?? 0);
      const tick = Number(row.tick_size) || 0.01;
      if (!Number.isFinite(last) || last <= 0) {
        throw new Error("bad last");
      }
      const lastR = roundToTick(last, tick);
      const prevR = roundToTick(prev > 0 ? prev : last, tick);
      const bid = roundToTick(Math.max(tick, lastR - tick), tick);
      const ask = roundToTick(lastR + tick, tick);
      await records(admin, "PATCH", "quotes_latest", {
        query: { instrument_id: `eq.${row.id}` },
        body: {
          last: lastR,
          prev_close: prevR,
          bid: Math.min(bid, lastR),
          ask: Math.max(ask, lastR),
          volume: Math.max(0, volume),
          ts: new Date().toISOString(),
        },
      });
      quotesOk += 1;

      const tsArr = chart.timestamp ?? [];
      const q = chart.indicators?.quote?.[0] ?? {};
      const lastIdx = tsArr.length - 1;
      if (lastIdx >= 0) {
        const o = roundToTick(Number(q.open?.[lastIdx] ?? lastR), tick);
        const h = roundToTick(Number(q.high?.[lastIdx] ?? lastR), tick);
        const l = roundToTick(Number(q.low?.[lastIdx] ?? lastR), tick);
        const c = roundToTick(Number(q.close?.[lastIdx] ?? lastR), tick);
        const v = Number(q.volume?.[lastIdx] ?? volume);
        const low = Math.min(l, o, c);
        const high = Math.max(h, o, c);
        const barTs = new Date(tsArr[lastIdx] * 1000).toISOString();
        try {
          await records(admin, "POST", "market_bars", {
            body: [
              {
                instrument_id: row.id,
                timeframe: "1d",
                ts: barTs,
                o,
                h: high,
                l: Math.max(tick, low),
                c,
                v: Math.max(0, v),
              },
            ],
          });
          barsOk += 1;
        } catch {
          await records(admin, "PATCH", "market_bars", {
            query: {
              instrument_id: `eq.${row.id}`,
              timeframe: "eq.1d",
              ts: `eq.${barTs}`,
            },
            body: { o, h: high, l: Math.max(tick, low), c, v: Math.max(0, v) },
          });
          barsOk += 1;
        }
      }

      const w52h = Number(meta.fiftyTwoWeekHigh);
      const w52l = Number(meta.fiftyTwoWeekLow);
      if (Number.isFinite(w52h) && Number.isFinite(w52l) && w52h > 0 && w52l > 0) {
        const existing = await records(admin, "GET", "fundamentals", {
          query: { instrument_id: `eq.${row.id}`, select: "metrics", limit: "1" },
        });
        const rec = Array.isArray(existing) ? existing[0] : existing?.[0];
        if (rec?.metrics) {
          const metrics = { ...rec.metrics, ranges: { ...rec.metrics.ranges } };
          metrics.ranges.week52_high = roundToTick(w52h, tick);
          metrics.ranges.week52_low = roundToTick(w52l, tick);
          await records(admin, "PATCH", "fundamentals", {
            query: { instrument_id: `eq.${row.id}` },
            body: { metrics, updated_at: new Date().toISOString() },
          });
          fundOk += 1;
        }
      }
    } catch (err) {
      quotesFail += 1;
      process.stdout.write(`  skip ${symbol}: ${err instanceof Error ? err.message : err}\n`);
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  process.stdout.write(
    `overlay: quotes_ok=${quotesOk} quotes_fail=${quotesFail} daily_bars=${barsOk} fundamentals=${fundOk}\n`,
  );

  const newsSymbols = PRIORITY.filter((s) => bySymbol.has(s));
  let newsInserted = 0;
  for (const symbol of newsSymbols) {
    const inst = bySymbol.get(symbol);
    let items = [];
    try {
      items = await yahooRss(symbol);
    } catch {
      items = [];
    }
    for (const item of items) {
      const id = randomUUID();
      const event_type = classifyEvent(item.headline);
      const sentiment = sentimentFromHeadline(item.headline);
      try {
        await records(admin, "POST", "news_items", {
          body: [
            {
              id,
              ts: item.ts,
              headline: item.headline.slice(0, 280),
              body: originalBody(symbol, item.headline),
              source: "Yahoo Finance RSS",
              symbols: [symbol],
              sector: inst.sector ?? null,
              sentiment,
              event_type,
            },
          ],
        });
        const embedding = hashEmbedding(id);
        await records(admin, "POST", "news_embeddings", {
          body: [
            {
              news_id: id,
              embedding,
              embedding_model: "local-hash-overlay",
            },
          ],
        });
        newsInserted += 1;
      } catch (err) {
        process.stdout.write(
          `  news skip ${symbol}: ${err instanceof Error ? err.message : err}\n`,
        );
      }
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  const minuteSymbols = newsSymbols.slice(0, 8);
  let minuteOk = 0;
  for (const symbol of minuteSymbols) {
    const inst = bySymbol.get(symbol);
    try {
      const chart = await yahooChart(symbol, "1d", "1m");
      const tsArr = chart.timestamp ?? [];
      const q = chart.indicators?.quote?.[0] ?? {};
      const tick = Number(inst.tick_size) || 0.01;
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
          instrument_id: inst.id,
          timeframe: "1m",
          ts: new Date(tsArr[i] * 1000).toISOString(),
          o: oo,
          h: hh,
          l: Math.max(tick, ll),
          c: cc,
          v: Math.max(0, v),
        });
      }
      const BATCH = 80;
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
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
      minuteOk += 1;
      process.stdout.write(`  1m ${symbol} bars=${rows.length}\n`);
    } catch (err) {
      process.stdout.write(`  1m skip ${symbol}: ${err instanceof Error ? err.message : err}\n`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  process.stdout.write(`overlay: news_inserted=${newsInserted} minute_symbols=${minuteOk}\n`);
  process.stdout.write("overlay: done\n");
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? (err.stack ?? err.message) : err}\n`);
  process.exit(1);
});
