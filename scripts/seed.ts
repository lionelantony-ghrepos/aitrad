import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAdminClient } from "@insforge/sdk";
import {
  generateInstrumentHistory,
  marketCalendarSeedRows,
  parseInstrumentsJson,
  quoteFromHistory,
  SEED_COUNT_SQL,
  evaluateSeedCounts,
  type OhlcvBar,
  type SeedCounts,
} from "@meridian/mock-data";
import { seedEnvSchema } from "@meridian/schemas";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BATCH = 400;

type AdminDatabase = ReturnType<typeof createAdminClient>["database"];

async function upsertBatch(
  db: AdminDatabase,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await db.from(table).upsert(chunk, { onConflict });
    if (error) {
      throw new Error(`${table} upsert failed at offset ${i}: ${error.message}`);
    }
    process.stdout.write(`  ${table} ${Math.min(i + chunk.length, rows.length)}/${rows.length}\n`);
  }
}

function loadInstruments() {
  const file = path.join(repoRoot, "mock_data", "instruments.json");
  return parseInstrumentsJson(JSON.parse(readFileSync(file, "utf8")) as unknown);
}

function querySeedCounts(): SeedCounts {
  const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
  const raw = execFileSync(
    npxBin,
    ["-y", "@insforge/cli", "db", "query", SEED_COUNT_SQL, "--json"],
    {
      encoding: "utf8",
      cwd: repoRoot,
    },
  );
  const parsed = JSON.parse(raw) as { rows?: Record<string, unknown>[] };
  const row = parsed.rows?.[0];
  if (!row) {
    throw new Error("SEED_COUNT_SQL_EMPTY");
  }
  return {
    instruments: Number(row.instruments),
    dailyBars: Number(row.daily_bars),
    minuteBars: Number(row.minute_bars),
    quotes: Number(row.quotes),
    minDailyPerInstrument: Number(row.min_daily_per_instrument),
    minMinutePerInstrument: Number(row.min_minute_per_instrument),
  };
}

function barRow(instrumentId: string, bar: OhlcvBar): Record<string, unknown> {
  return {
    instrument_id: instrumentId,
    timeframe: bar.timeframe,
    ts: bar.ts,
    o: bar.o,
    h: bar.h,
    l: bar.l,
    c: bar.c,
    v: bar.v,
  };
}

export async function runUniverseSeed(): Promise<void> {
  const env = seedEnvSchema.parse({
    INSFORGE_URL: process.env.INSFORGE_URL,
    INSFORGE_API_KEY: process.env.INSFORGE_API_KEY,
  });
  const admin = createAdminClient({
    baseUrl: env.INSFORGE_URL,
    apiKey: env.INSFORGE_API_KEY,
  });
  const universe = loadInstruments();
  process.stdout.write(`Seeding ${universe.length} instruments…\n`);

  const calendarRows = marketCalendarSeedRows(2026);
  process.stdout.write(`Upserting ${calendarRows.length} NYSE 2026 sessions…\n`);
  await upsertBatch(
    admin.database,
    "market_calendar",
    calendarRows.map((row) => ({
      session_date: row.session_date,
      venue: row.venue,
      session_kind: row.session_kind,
      open_minute: row.open_minute,
      close_minute: row.close_minute,
    })),
    "venue,session_date",
  );

  await upsertBatch(
    admin.database,
    "instruments",
    universe.map((row) => ({
      symbol: row.symbol,
      name: row.name,
      exchange: row.exchange,
      sector: row.sector,
      industry: row.industry,
      status: row.status,
      currency: row.currency,
      tick_size: row.tick_size,
      lot_size: row.lot_size,
      market_cap_band: row.market_cap_band,
      beta_class: row.beta_class,
      avg_volume: row.avg_volume,
      avg_volume_band: row.avg_volume_band,
      base_price: row.base_price,
    })),
    "symbol",
  );

  const { data: idRows, error: idError } = await admin.database
    .from("instruments")
    .select("id, symbol");
  if (idError) {
    throw new Error(`instruments select failed: ${idError.message}`);
  }
  const idBySymbol = new Map<string, string>();
  for (const row of idRows ?? []) {
    const rec = row as { id: string; symbol: string };
    idBySymbol.set(rec.symbol, rec.id);
  }

  const barRows: Record<string, unknown>[] = [];
  const quoteRows: Record<string, unknown>[] = [];
  for (const instrument of universe) {
    const id = idBySymbol.get(instrument.symbol);
    if (!id) {
      throw new Error(`MISSING_INSTRUMENT_ID:${instrument.symbol}`);
    }
    const history = generateInstrumentHistory(instrument);
    for (const bar of history.daily) {
      barRows.push(barRow(id, bar));
    }
    for (const bar of history.minutes) {
      barRows.push(barRow(id, bar));
    }
    const quote = quoteFromHistory(history, instrument.tick_size);
    quoteRows.push({ instrument_id: id, ...quote });
  }

  process.stdout.write(`Upserting ${barRows.length} market_bars…\n`);
  await upsertBatch(admin.database, "market_bars", barRows, "instrument_id,timeframe,ts");
  process.stdout.write(`Upserting ${quoteRows.length} quotes_latest…\n`);
  await upsertBatch(admin.database, "quotes_latest", quoteRows, "instrument_id");

  process.stdout.write("SQL count check:\n");
  process.stdout.write(`${SEED_COUNT_SQL}\n`);
  const counts = querySeedCounts();
  const report = evaluateSeedCounts(counts);
  for (const line of report.lines) {
    process.stdout.write(`${line}\n`);
  }
  if (!report.ok) {
    process.exitCode = 1;
    throw new Error("SEED_COUNT_MISMATCH");
  }
  process.stdout.write("Seed verification passed.\n");
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  runUniverseSeed().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
