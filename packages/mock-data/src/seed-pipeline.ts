import {
  EXPECTED_DEMO_POSITIONS,
  EXPECTED_DEMO_USERS,
  EXPECTED_DEMO_WATCHLISTS,
  EXPECTED_PUBLISHED_TABLES,
  SEED_ALL_STEPS,
  type FullSeedCounts,
  type SeedAllStep,
} from "@meridian/schemas";
import {
  EXPECTED_FUNDAMENTALS,
  EXPECTED_INSTRUMENTS,
  EXPECTED_MINUTE_BARS_TOTAL,
  EXPECTED_NEWS_EMBEDDINGS,
  EXPECTED_NEWS_ITEMS,
  MIN_DAILY_BARS_PER_INSTRUMENT,
} from "./expected-counts";

export { SEED_ALL_STEPS };

export type SeedPipelineReport = {
  ok: boolean;
  lines: string[];
};

export function assertSeedAllOrder(steps: readonly SeedAllStep[]): void {
  if (steps.length !== SEED_ALL_STEPS.length) {
    throw new Error("SEED_ALL_STEP_COUNT");
  }
  for (let i = 0; i < SEED_ALL_STEPS.length; i += 1) {
    if (steps[i] !== SEED_ALL_STEPS[i]) {
      throw new Error(`SEED_ALL_ORDER:${String(steps[i])}`);
    }
  }
}

export function evaluateFullSeedCounts(counts: FullSeedCounts): SeedPipelineReport {
  const lines = [
    `instruments ${counts.instruments} (expected ${EXPECTED_INSTRUMENTS})`,
    `daily_bars ${counts.dailyBars} (expected >= ${EXPECTED_INSTRUMENTS * MIN_DAILY_BARS_PER_INSTRUMENT})`,
    `minute_bars ${counts.minuteBars} (expected ${EXPECTED_MINUTE_BARS_TOTAL})`,
    `quotes_latest ${counts.quotes} (expected ${EXPECTED_INSTRUMENTS})`,
    `published_tables ${counts.publishedTables} (expected ${EXPECTED_PUBLISHED_TABLES})`,
    `news_items ${counts.newsItems} (expected ${EXPECTED_NEWS_ITEMS})`,
    `news_embeddings ${counts.newsEmbeddings} (expected ${EXPECTED_NEWS_EMBEDDINGS})`,
    `fundamentals ${counts.fundamentals} (expected ${EXPECTED_FUNDAMENTALS})`,
    `users ${counts.users} (expected ${EXPECTED_DEMO_USERS})`,
    `demo_positions ${counts.demoPositions} (expected ${EXPECTED_DEMO_POSITIONS})`,
    `watchlists ${counts.watchlists} (expected ${EXPECTED_DEMO_WATCHLISTS})`,
  ];
  const ok =
    counts.instruments === EXPECTED_INSTRUMENTS &&
    counts.dailyBars >= EXPECTED_INSTRUMENTS * MIN_DAILY_BARS_PER_INSTRUMENT &&
    counts.minuteBars === EXPECTED_MINUTE_BARS_TOTAL &&
    counts.quotes === EXPECTED_INSTRUMENTS &&
    counts.publishedTables === EXPECTED_PUBLISHED_TABLES &&
    counts.newsItems === EXPECTED_NEWS_ITEMS &&
    counts.newsEmbeddings === EXPECTED_NEWS_EMBEDDINGS &&
    counts.fundamentals === EXPECTED_FUNDAMENTALS &&
    counts.users === EXPECTED_DEMO_USERS &&
    counts.demoPositions === EXPECTED_DEMO_POSITIONS &&
    counts.watchlists === EXPECTED_DEMO_WATCHLISTS;
  return { ok, lines };
}

export const FULL_SEED_COUNT_SQL = `
SELECT
  (SELECT COUNT(*)::int FROM public.instruments) AS instruments,
  (SELECT COUNT(*)::int FROM public.market_bars WHERE timeframe = '1d') AS daily_bars,
  (SELECT COUNT(*)::int FROM public.market_bars WHERE timeframe = '1m') AS minute_bars,
  (SELECT COUNT(*)::int FROM public.quotes_latest) AS quotes,
  (SELECT COUNT(DISTINCT table_key)::int FROM public.decision_tables WHERE status = 'published') AS published_tables,
  (SELECT COUNT(*)::int FROM public.news_items) AS news_items,
  (SELECT COUNT(*)::int FROM public.news_embeddings) AS news_embeddings,
  (SELECT COUNT(*)::int FROM public.fundamentals) AS fundamentals,
  (SELECT COUNT(*)::int FROM auth.users WHERE email IN (
    'demo.trader@meridian.test',
    'demo.novice@meridian.test',
    'demo.admin@meridian.test',
    'demo.compliance@meridian.test'
  )) AS users,
  (SELECT COUNT(*)::int FROM public.positions p
     JOIN public.profiles pr ON pr.user_id = p.user_id
     JOIN auth.users u ON u.id = p.user_id
     WHERE u.email = 'demo.trader@meridian.test') AS demo_positions,
  (SELECT COUNT(*)::int FROM public.watchlists w
     JOIN auth.users u ON u.id = w.user_id
     WHERE u.email = 'demo.trader@meridian.test') AS watchlists
`.trim();
