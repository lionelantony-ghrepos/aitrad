export const packageName = "@meridian/mock-data" as const;

export {
  DAILY_BAR_COUNT,
  GBM_SESSIONS_PER_YEAR,
  HISTORY_SEED,
  INTRADAY_SESSION_COUNT,
  MINUTES_PER_SESSION,
  SESSION_END_DATE,
  dailyBarTs,
  isNyseSession,
  minuteBarTs,
  tradingDaysEndingOn,
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
  enforceOhlc,
  generateInstrumentHistory,
  quoteFromHistory,
  roundToTick,
  type GenerateHistoryOptions,
  type InstrumentHistory,
  type OhlcvBar,
} from "./generator";
export { parseInstrumentsJson } from "./instruments";
export { gaussian, hashSymbolSeed, mulberry32 } from "./rng";
export { annualSigma, simParamsForBeta, type SimParams } from "./sim-params";
