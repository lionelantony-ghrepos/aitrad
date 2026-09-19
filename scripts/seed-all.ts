import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fullSeedCountsSchema } from "@meridian/schemas";
import { FULL_SEED_COUNT_SQL, evaluateFullSeedCounts } from "@meridian/mock-data";
import { runUniverseSeed } from "./seed.ts";
import { runRulesSeed } from "./seed-rules.ts";
import { runDemoUserSeed } from "./seed-demo-users.ts";
import { runWorkspaceSeed } from "./seed-workspace.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function queryFullSeedCounts() {
  const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
  const raw = execFileSync(
    npxBin,
    ["-y", "@insforge/cli", "db", "query", FULL_SEED_COUNT_SQL, "--json"],
    {
      encoding: "utf8",
      cwd: repoRoot,
    },
  );
  const parsed = JSON.parse(raw) as { rows?: Record<string, unknown>[] };
  const row = parsed.rows?.[0];
  if (!row) {
    throw new Error("FULL_SEED_COUNT_SQL_EMPTY");
  }
  return fullSeedCountsSchema.parse({
    instruments: Number(row.instruments),
    dailyBars: Number(row.daily_bars),
    minuteBars: Number(row.minute_bars),
    quotes: Number(row.quotes),
    publishedTables: Number(row.published_tables),
    newsItems: Number(row.news_items),
    newsEmbeddings: Number(row.news_embeddings),
    fundamentals: Number(row.fundamentals),
    users: Number(row.users),
    demoPositions: Number(row.demo_positions),
    watchlists: Number(row.watchlists),
  });
}

export async function runSeedAll(): Promise<void> {
  process.stdout.write(
    "seed-all: universe (instruments, calendar, bars, quotes, news, fundamentals)\n",
  );
  await runUniverseSeed();
  process.stdout.write("seed-all: rules (publish baseline tables)\n");
  await runRulesSeed();
  process.stdout.write("seed-all: demo users, portfolio, watchlists, feed test mode\n");
  await runDemoUserSeed();
  process.stdout.write("seed-all: workspace fixtures (screens, alerts, blotter, copilot)\n");
  await runWorkspaceSeed();
  process.stdout.write("seed-all: verification report\n");
  const counts = queryFullSeedCounts();
  const report = evaluateFullSeedCounts(counts);
  for (const line of report.lines) {
    process.stdout.write(`${line}\n`);
  }
  if (!report.ok) {
    throw new Error("SEED_ALL_COUNT_MISMATCH");
  }
  process.stdout.write("seed-all verification passed.\n");
  applyFrozenMarketSnapshot();
}

/** Offline Path A overlay. Never hits Yahoo; freeze is `pnpm market:freeze`. */
function applyFrozenMarketSnapshot(): void {
  process.stdout.write("seed-all: applying frozen market snapshot (offline, no Yahoo)\n");
  execFileSync(process.execPath, [path.join(repoRoot, "scripts", "overlay-live-market.mjs")], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  runSeedAll().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
