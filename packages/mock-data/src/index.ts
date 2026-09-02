export const packageName = "@meridian/mock-data" as const;

export {
  DAILY_BAR_COUNT,
  GBM_SESSIONS_PER_YEAR,
  HISTORY_SEED,
  INTRADAY_SESSION_COUNT,
  MINUTES_PER_SESSION,
  NY_TZ,
  SESSION_END_DATE,
  dailyBarTs,
  isNyseHalfDay,
  isNyseSession,
  lookupSession,
  minuteBarTs,
  nyClockParts,
  nyseHalfDays,
  nyseSessionState,
  nyseTradingSessions,
  tradingDaysEndingOn,
  type MarketCalendarRow,
  type NyClockParts,
  type NyseSessionState,
} from "./calendar";
export {
  EXPECTED_INSTRUMENTS,
  EXPECTED_MINUTE_BARS_TOTAL,
  MINUTE_BARS_PER_INSTRUMENT,
  MIN_DAILY_BARS_PER_INSTRUMENT,
  SEED_COUNT_SQL,
  evaluateSeedCounts,
  type SeedCounts,
} from "./expected-counts";
export {
  MAX_QUOTE_BATCHES_PER_SEC,
  coalesceQuoteBatches,
  minuteBucketTs,
  parseFeedControls,
  rollMinuteBar,
  runFeedInvocation,
  stepGbmPrice,
  type FeedBarWrite,
  type FeedControls,
  type FeedInstrument,
  type FeedInvocationInput,
  type FeedInvocationResult,
  type FeedMinuteBar,
  type FeedQuote,
  type GbmStepInput,
  type GbmStepResult,
} from "./feed";
export {
  enforceOhlc,
  generateInstrumentHistory,
  quoteFromHistory,
  roundToTick,
  type GenerateHistoryOptions,
  type InstrumentHistory,
  type OhlcvBar,
} from "./generator";
export { parseInstrumentsJson } from "./instruments";
export { marketCalendarInsertSql, marketCalendarSeedRows } from "./calendar-sql";
export { gaussian, hashSymbolSeed, mulberry32 } from "./rng";
export { annualSigma, simParamsForBeta, type SimParams } from "./sim-params";
