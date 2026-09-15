import { z } from "zod";
import { experienceLevelSchema } from "./entities";
import { userRoleSchema } from "./admin-users";

export const demoUserRecordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: userRoleSchema,
  display_name: z.string().min(1),
  experience_level: experienceLevelSchema,
});

export type DemoUserRecord = z.infer<typeof demoUserRecordSchema>;

export const demoPositionRecordSchema = z.object({
  symbol: z.string().min(1),
  qty: z.number().positive(),
  avg_cost: z.number().nonnegative(),
});

export type DemoPositionRecord = z.infer<typeof demoPositionRecordSchema>;

export const demoPortfolioRecordSchema = z.object({
  cash: z.number().nonnegative(),
  positions: z.array(demoPositionRecordSchema).min(1),
  watchlists: z.record(z.string().min(1), z.array(z.string().min(1)).min(1)),
});

export type DemoPortfolioRecord = z.infer<typeof demoPortfolioRecordSchema>;

export const demoUsersFixtureSchema = z.object({
  users: z.array(demoUserRecordSchema).min(1),
  portfolios: z.record(z.string().email(), demoPortfolioRecordSchema),
});

export type DemoUsersFixture = z.infer<typeof demoUsersFixtureSchema>;

/** Ordered seed-all stages from docs/06 §4 plus feed test-mode + verify. */
export const seedAllStepSchema = z.enum([
  "instruments",
  "market_calendar",
  "bars",
  "quotes_latest",
  "rules",
  "fundamentals",
  "news",
  "demo_users",
  "demo_portfolio",
  "watchlists",
  "feed_test_mode",
  "verify",
]);

export type SeedAllStep = z.infer<typeof seedAllStepSchema>;

export const SEED_ALL_STEPS: readonly SeedAllStep[] = seedAllStepSchema.options;

export const fullSeedCountsSchema = z.object({
  instruments: z.number().int().nonnegative(),
  dailyBars: z.number().int().nonnegative(),
  minuteBars: z.number().int().nonnegative(),
  quotes: z.number().int().nonnegative(),
  publishedTables: z.number().int().nonnegative(),
  newsItems: z.number().int().nonnegative(),
  newsEmbeddings: z.number().int().nonnegative(),
  fundamentals: z.number().int().nonnegative(),
  users: z.number().int().nonnegative(),
  demoPositions: z.number().int().nonnegative(),
  watchlists: z.number().int().nonnegative(),
});

export type FullSeedCounts = z.infer<typeof fullSeedCountsSchema>;

export const EXPECTED_PUBLISHED_TABLES = 12;
export const EXPECTED_DEMO_USERS = 4;
export const EXPECTED_DEMO_POSITIONS = 6;
export const EXPECTED_DEMO_WATCHLISTS = 3;

/** Ordered RELEASE.md runbook stages (PBI-031). */
export const releaseRunbookStepSchema = z.enum([
  "migrate",
  "seed",
  "verify_audit_chain",
  "e2e",
  "tag",
]);

export type ReleaseRunbookStep = z.infer<typeof releaseRunbookStepSchema>;

export const RELEASE_RUNBOOK_STEPS: readonly ReleaseRunbookStep[] =
  releaseRunbookStepSchema.options;
