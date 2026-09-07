// insforge/functions/market-tick-src.ts
import { createAdminClient } from "npm:@insforge/sdk";

// packages/mock-data/src/calendar.ts
var MINUTES_PER_SESSION = 390;
var GBM_SESSIONS_PER_YEAR = 252;
function pad2(n) {
  return String(n).padStart(2, "0");
}
function formatYmd(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}
function parseYmd(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new Error(`INVALID_DATE:${isoDate}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return { year, month, day };
}
function utcWeekday(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}
function addUtcDays(year, month, day, delta) {
  const dt = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { year, month, day };
}
function nthWeekday(year, month, weekday, nth) {
  const first = utcWeekday(year, month, 1);
  const offset = (weekday - first + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  return { year, month, day };
}
function lastWeekday(year, month, weekday) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastWd = utcWeekday(year, month, lastDay);
  const delta = (lastWd - weekday + 7) % 7;
  return { year, month, day: lastDay - delta };
}
function observed(year, month, day) {
  const wd = utcWeekday(year, month, day);
  if (wd === 6) {
    const prev = addUtcDays(year, month, day, -1);
    return formatYmd(prev.year, prev.month, prev.day);
  }
  if (wd === 0) {
    const next = addUtcDays(year, month, day, 1);
    return formatYmd(next.year, next.month, next.day);
  }
  return formatYmd(year, month, day);
}
var holidayCache = /* @__PURE__ */ new Map();
function nyseHolidays(year) {
  const cached = holidayCache.get(year);
  if (cached) {
    return cached;
  }
  const easter = easterSunday(year);
  const goodFriday = addUtcDays(easter.year, easter.month, easter.day, -2);
  const mlk = nthWeekday(year, 1, 1, 3);
  const presidents = nthWeekday(year, 2, 1, 3);
  const memorial = lastWeekday(year, 5, 1);
  const labor = nthWeekday(year, 9, 1, 1);
  const thanksgiving = nthWeekday(year, 11, 4, 4);
  const set = /* @__PURE__ */ new Set([
    observed(year, 1, 1),
    formatYmd(mlk.year, mlk.month, mlk.day),
    formatYmd(presidents.year, presidents.month, presidents.day),
    formatYmd(goodFriday.year, goodFriday.month, goodFriday.day),
    formatYmd(memorial.year, memorial.month, memorial.day),
    observed(year, 6, 19),
    observed(year, 7, 4),
    formatYmd(labor.year, labor.month, labor.day),
    formatYmd(thanksgiving.year, thanksgiving.month, thanksgiving.day),
    observed(year, 12, 25),
  ]);
  holidayCache.set(year, set);
  return set;
}
var NY_TZ = "America/New_York";
var REGULAR_OPEN_MINUTE = 9 * 60 + 30;
var REGULAR_CLOSE_MINUTE = 16 * 60;
var HALF_CLOSE_MINUTE = 13 * 60;
function nyClockParts(now) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TZ,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    weekday: get("weekday"),
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}
function nyseHalfDays(year) {
  const thanksgiving = nthWeekday(year, 11, 4, 4);
  const friday = addUtcDays(thanksgiving.year, thanksgiving.month, thanksgiving.day, 1);
  const fridayIso = formatYmd(friday.year, friday.month, friday.day);
  const eve = formatYmd(year, 12, 24);
  const set = /* @__PURE__ */ new Set();
  if (isNyseSession(fridayIso)) {
    set.add(fridayIso);
  }
  if (isNyseSession(eve)) {
    set.add(eve);
  }
  return set;
}
function nyseTradingSessions(year) {
  const half = nyseHalfDays(year);
  const rows = [];
  const cursor = { year, month: 1, day: 1 };
  const end = new Date(Date.UTC(year + 1, 0, 1)).getTime();
  while (Date.UTC(cursor.year, cursor.month - 1, cursor.day) < end) {
    const iso = formatYmd(cursor.year, cursor.month, cursor.day);
    if (isNyseSession(iso)) {
      const kind = half.has(iso) ? "half" : "regular";
      rows.push({
        session_date: iso,
        venue: "NYSE",
        session_kind: kind,
        open_minute: REGULAR_OPEN_MINUTE,
        close_minute: kind === "half" ? HALF_CLOSE_MINUTE : REGULAR_CLOSE_MINUTE,
      });
    }
    const next = addUtcDays(cursor.year, cursor.month, cursor.day, 1);
    cursor.year = next.year;
    cursor.month = next.month;
    cursor.day = next.day;
  }
  return rows;
}
function lookupSession(isoDate, sessions) {
  return sessions.find((row) => row.session_date === isoDate);
}
function nyseSessionState(now, sessions) {
  const p = nyClockParts(now);
  const rows = sessions ?? nyseTradingSessions(Number.parseInt(p.dateKey.slice(0, 4), 10));
  const row = lookupSession(p.dateKey, rows);
  if (!row) {
    return "CLOSED";
  }
  const minutes = p.hour * 60 + p.minute;
  if (minutes >= row.open_minute && minutes < row.close_minute) {
    return "OPEN";
  }
  return "CLOSED";
}
function isNyseSession(isoDate) {
  const { year, month, day } = parseYmd(isoDate);
  const wd = utcWeekday(year, month, day);
  if (wd === 0 || wd === 6) {
    return false;
  }
  return !nyseHolidays(year).has(isoDate);
}

// packages/mock-data/src/rng.ts
function hashSymbolSeed(symbol, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < symbol.length; i += 1) {
    h = Math.imul(h ^ symbol.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 1831565813) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(rng) {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// packages/mock-data/src/sim-params.ts
var DT_SIM_01_DEFAULTS = {
  gapEventProbPerDay: 0,
  gapRangePct: [0, 0],
  volMultiplier: 1,
};
var DT_SIM_01_ROWS = [
  {
    when: () => true,
    apply: (acc) => ({ ...acc, gapEventProbPerDay: 0.02, gapRangePct: [1, 6] }),
  },
  {
    when: (ctx) => ctx.betaClass === "high",
    apply: (acc) => ({ ...acc, volMultiplier: 1.8 }),
  },
  {
    when: (ctx) => ctx.betaClass === "low",
    apply: (acc) => ({ ...acc, volMultiplier: 0.6 }),
  },
];
function simParamsForBeta(betaClass) {
  return DT_SIM_01_ROWS.reduce(
    (acc, row) => (row.when({ betaClass }) ? row.apply(acc) : acc),
    DT_SIM_01_DEFAULTS,
  );
}
var ANNUAL_SIGMA = {
  low: 0.15,
  medium: 0.28,
  high: 0.55,
};
function annualSigma(betaClass) {
  return ANNUAL_SIGMA[betaClass] * simParamsForBeta(betaClass).volMultiplier;
}

// packages/mock-data/src/generator.ts
function roundToTick(price, tickSize) {
  if (tickSize <= 0) {
    throw new Error("TICK_SIZE_POSITIVE");
  }
  const n = Math.round(price / tickSize);
  return Number((n * tickSize).toFixed(10));
}
function enforceOhlc(o, h, l, c, tickSize) {
  let open = roundToTick(o, tickSize);
  let high = roundToTick(h, tickSize);
  let low = roundToTick(l, tickSize);
  let close = roundToTick(c, tickSize);
  const minOc = Math.min(open, close);
  const maxOc = Math.max(open, close);
  if (low > minOc) {
    low = minOc;
  }
  if (high < maxOc) {
    high = maxOc;
  }
  if (low <= 0) {
    low = tickSize;
  }
  if (open < low) {
    open = low;
  }
  if (close < low) {
    close = low;
  }
  if (open > high) {
    open = high;
  }
  if (close > high) {
    close = high;
  }
  return { o: open, h: high, l: low, c: close };
}

// packages/mock-data/src/feed.ts
var MAX_QUOTE_BATCHES_PER_SEC = 4;
function stepGbmPrice(input) {
  const seed = input.seed ?? 42;
  const last = roundToTick(Math.max(input.tickSize, input.last), input.tickSize);
  if (!input.sessionOpen) {
    return { last, appliedGap: false };
  }
  let price = last;
  let appliedGap = false;
  const sim = simParamsForBeta(input.betaClass);
  if (input.sessionOpenStart) {
    const dayId = Math.floor(input.simEpochSec / 86400);
    const gapRng = mulberry32(hashSymbolSeed(`${input.symbol}:gap:${dayId}`, seed));
    if (gapRng() < sim.gapEventProbPerDay) {
      const lo = sim.gapRangePct[0];
      const hi = sim.gapRangePct[1];
      const mag = (lo + gapRng() * (hi - lo)) / 100;
      const sign = gapRng() < 0.5 ? -1 : 1;
      price *= 1 + sign * mag;
      appliedGap = true;
    }
  }
  const sigma = annualSigma(input.betaClass);
  const dt = 1 / (GBM_SESSIONS_PER_YEAR * MINUTES_PER_SESSION * 60);
  const muRng = mulberry32(hashSymbolSeed(`${input.symbol}:mu`, seed));
  const mu = 0.06 + 0.08 * gaussian(muRng);
  const zRng = mulberry32(hashSymbolSeed(`${input.symbol}:z:${input.simEpochSec}`, seed));
  const z = gaussian(zRng);
  price *= Math.exp((mu - (sigma * sigma) / 2) * dt + sigma * Math.sqrt(dt) * z);
  return { last: roundToTick(Math.max(input.tickSize, price), input.tickSize), appliedGap };
}
function minuteBucketTs(iso) {
  const d = new Date(iso);
  d.setUTCSeconds(0, 0);
  return d.toISOString();
}
function rollMinuteBar(current, tick) {
  const bucket = minuteBucketTs(tick.ts);
  const startBar = (open, ts) => {
    const ohlc2 = enforceOhlc(open, open, open, open, tick.tickSize);
    return {
      timeframe: "1m",
      ts,
      ...ohlc2,
      v: tick.volumeDelta,
    };
  };
  if (!current) {
    return { completed: null, current: startBar(tick.last, bucket) };
  }
  if (current.ts !== bucket) {
    return { completed: current, current: startBar(tick.last, bucket) };
  }
  const ohlc = enforceOhlc(
    current.o,
    Math.max(current.h, tick.last),
    Math.min(current.l, tick.last),
    tick.last,
    tick.tickSize,
  );
  return {
    completed: null,
    current: { ...current, ...ohlc, v: current.v + tick.volumeDelta },
  };
}
function coalesceQuoteBatches(items, maxPerSec = MAX_QUOTE_BATCHES_PER_SEC) {
  if (items.length <= maxPerSec) {
    return [...items];
  }
  if (maxPerSec <= 1) {
    return items.length === 0 ? [] : [items[items.length - 1]];
  }
  const out = [];
  let prev = -1;
  for (let i = 0; i < maxPerSec; i += 1) {
    const idx = Math.round((i * (items.length - 1)) / (maxPerSec - 1));
    if (idx === prev) {
      continue;
    }
    const item = items[idx];
    if (item !== void 0) {
      out.push(item);
      prev = idx;
    }
  }
  return out;
}
function asRecord(value) {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value;
  }
  return null;
}
function parsePaused(value) {
  if (value === true || value === "true") {
    return true;
  }
  const rec = asRecord(value);
  if (rec && "paused" in rec) {
    return rec.paused === true || rec.paused === "true";
  }
  return false;
}
function parseSpeed(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : void 0;
  }
  const rec = asRecord(value);
  if (rec && typeof rec.speed === "number" && Number.isFinite(rec.speed)) {
    return rec.speed;
  }
  return void 0;
}
function parseForce(value) {
  const rec = asRecord(value);
  if (!rec) {
    return null;
  }
  const symbol = rec.symbol;
  const price = rec.price;
  if (typeof symbol === "string" && price !== void 0 && Number.isFinite(Number(price))) {
    return { symbol, price: Number(price) };
  }
  return null;
}
function parseFeedControls(rows) {
  let paused = false;
  let speed = 1;
  let forcePrice = null;
  for (const row of rows) {
    if (row.key === "feed.paused") {
      paused = parsePaused(row.value);
    } else if (row.key === "feed.speed") {
      const parsed = parseSpeed(row.value);
      if (parsed !== void 0) {
        speed = parsed;
      }
    } else if (row.key === "feed.force_price") {
      forcePrice = parseForce(row.value);
    }
  }
  return { paused, speed, forcePrice };
}
function barWriteKey(bar) {
  return `${bar.instrument_id}${bar.timeframe}${minuteBucketTs(bar.ts)}`;
}
function mergeBarWrites(first, next) {
  const ts = minuteBucketTs(first.ts);
  return {
    instrument_id: first.instrument_id,
    timeframe: first.timeframe,
    ts,
    o: first.o,
    h: Math.max(first.h, next.h),
    l: Math.min(first.l, next.l),
    c: next.c,
    v: first.v + next.v,
  };
}
function normalizeBarsToUpsert(bars) {
  const order = [];
  const byKey = /* @__PURE__ */ new Map();
  for (const bar of bars) {
    const canonical = { ...bar, ts: minuteBucketTs(bar.ts) };
    const key = barWriteKey(canonical);
    const prior = byKey.get(key);
    if (prior === void 0) {
      order.push(key);
      byKey.set(key, canonical);
    } else {
      byKey.set(key, mergeBarWrites(prior, canonical));
    }
  }
  return order.map((key) => byKey.get(key));
}
function spreadQuote(last, tickSize, volume, ts, prevClose) {
  const rounded = roundToTick(Math.max(tickSize, last), tickSize);
  const bid = roundToTick(Math.max(tickSize, rounded - tickSize), tickSize);
  const ask = roundToTick(rounded + tickSize, tickSize);
  return {
    instrument_id: "",
    bid: Math.min(bid, rounded),
    ask: Math.max(ask, rounded),
    last: rounded,
    prev_close: prevClose,
    volume,
    ts,
  };
}
function volumePerSecond(avgVolume, sessionMinutes) {
  const seconds = Math.max(1, sessionMinutes * 60);
  return Math.max(1, Math.round(avgVolume / seconds));
}
function runFeedInvocation(input) {
  const seed = input.seed ?? 42;
  const now = new Date(input.nowIso);
  const session = nyseSessionState(now, input.calendar);
  const byId = new Map(input.quotes.map((q) => [q.instrument_id, { ...q }]));
  const currentBar = /* @__PURE__ */ new Map();
  for (const bar of normalizeBarsToUpsert(
    input.minuteBars.map((row) => ({ ...row, ts: minuteBucketTs(row.ts) })),
  )) {
    currentBar.set(bar.instrument_id, {
      timeframe: bar.timeframe,
      ts: bar.ts,
      o: bar.o,
      h: bar.h,
      l: bar.l,
      c: bar.c,
      v: bar.v,
    });
  }
  let consumeForcePrice = false;
  if (input.flags.forcePrice) {
    consumeForcePrice = true;
    const target = input.instruments.find((i) => i.symbol === input.flags.forcePrice?.symbol);
    if (target) {
      const q = byId.get(target.id);
      if (q) {
        const next = spreadQuote(
          input.flags.forcePrice.price,
          target.tick_size,
          q.volume,
          q.ts,
          q.prev_close,
        );
        next.instrument_id = q.instrument_id;
        byId.set(target.id, next);
      }
    }
  }
  const ticks =
    input.flags.paused || input.flags.speed <= 0
      ? 0
      : Math.max(0, Math.round(input.flags.speed * input.intervalSeconds));
  const snapshots = [];
  const barsToUpsert = [];
  for (let k = 0; k < ticks; k += 1) {
    const sim = new Date(now.getTime() + (k + 1) * 1e3);
    const simIso = sim.toISOString();
    const open = nyseSessionState(sim, input.calendar) === "OPEN";
    const prev = nyseSessionState(new Date(sim.getTime() - 1e3), input.calendar) === "OPEN";
    const sessionOpenStart = open && !prev;
    const partsDate = lookupSession(nyClockParts(sim).dateKey, input.calendar);
    const sessionMinutes = partsDate
      ? partsDate.close_minute - partsDate.open_minute
      : MINUTES_PER_SESSION;
    for (const inst of input.instruments) {
      const q = byId.get(inst.id);
      if (!q) {
        continue;
      }
      const stepped = stepGbmPrice({
        last: q.last,
        tickSize: inst.tick_size,
        betaClass: inst.beta_class,
        symbol: inst.symbol,
        simEpochSec: Math.floor(sim.getTime() / 1e3),
        seed,
        sessionOpen: open,
        sessionOpenStart,
      });
      const volDelta = open ? volumePerSecond(inst.avg_volume, sessionMinutes) : 0;
      const next = spreadQuote(
        stepped.last,
        inst.tick_size,
        q.volume + volDelta,
        simIso,
        q.prev_close,
      );
      next.instrument_id = q.instrument_id;
      byId.set(inst.id, next);
      if (open) {
        const rolled = rollMinuteBar(currentBar.get(inst.id) ?? null, {
          last: next.last,
          volumeDelta: volDelta,
          ts: simIso,
          tickSize: inst.tick_size,
        });
        if (rolled.completed) {
          barsToUpsert.push({ ...rolled.completed, instrument_id: inst.id });
        }
        currentBar.set(inst.id, rolled.current);
      }
    }
    snapshots.push([...byId.values()].map((q) => ({ ...q })));
  }
  for (const [instrumentId, bar] of currentBar) {
    barsToUpsert.push({ ...bar, instrument_id: instrumentId });
  }
  const quotesOut = [...byId.values()];
  let publishes = [];
  if (ticks > 0 && session === "OPEN") {
    publishes = coalesceQuoteBatches(snapshots, MAX_QUOTE_BATCHES_PER_SEC);
  } else if (consumeForcePrice && ticks === 0) {
    publishes = [quotesOut.map((q) => ({ ...q }))];
  }
  return {
    session,
    ticksApplied: ticks,
    quotes: quotesOut,
    barsToUpsert: normalizeBarsToUpsert(barsToUpsert),
    publishes,
    consumeForcePrice,
  };
}

// insforge/functions/market-tick-src.ts
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function asRows(data) {
  return Array.isArray(data) ? data : [];
}
function flagValue(row) {
  if (typeof row.key !== "string") {
    return null;
  }
  return { key: row.key, value: row.value };
}
async function market_tick_src_default(req) {
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
  const intervalSeconds = intervalRaw === void 0 ? 1 : Number(intervalRaw);
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
    asRows(flagData)
      .map(flagValue)
      .filter((row) => row !== null),
  );
  const { data: calData, error: calErr } = await admin.database
    .from("market_calendar")
    .select("session_date,venue,session_kind,open_minute,close_minute")
    .eq("venue", "NYSE");
  if (calErr) {
    return json(500, { error: calErr.message });
  }
  const calendar = asRows(calData).map((row) => ({
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
  const instruments = asRows(instData)
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
  const quotes = asRows(quoteData).map((row) => ({
    instrument_id: row.instrument_id,
    bid: Number(row.bid),
    ask: Number(row.ask),
    last: Number(row.last),
    prev_close: Number(row.prev_close),
    volume: Number(row.volume),
    ts: row.ts,
  }));
  const minuteBars = [];
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
    for (const row of asRows(barData)) {
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
  const nowIso = /* @__PURE__ */ new Date().toISOString();
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
export { market_tick_src_default as default };
