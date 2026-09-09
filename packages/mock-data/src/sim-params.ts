import type { BetaClass } from "@meridian/schemas";

/**
 * DT-SIM-01 (ALL merge) as a local table until rules-service publishes it (PBI-010).
 * Do not copy these cells into UI or docs/kb.
 */
export type SimParams = {
  gapEventProbPerDay: number;
  gapRangePct: readonly [number, number];
  volMultiplier: number;
  driftNudgeBpsPerSentiment: number;
};

type SimContext = { betaClass: BetaClass; newsSentimentShock: boolean };

type DtSim01Row = {
  when: (ctx: SimContext) => boolean;
  apply: (acc: SimParams) => SimParams;
};

const DT_SIM_01_DEFAULTS: SimParams = {
  gapEventProbPerDay: 0,
  gapRangePct: [0, 0],
  volMultiplier: 1,
  driftNudgeBpsPerSentiment: 0,
};

const DT_SIM_01_ROWS: readonly DtSim01Row[] = [
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
  {
    when: (ctx) => ctx.newsSentimentShock,
    apply: (acc) => ({ ...acc, driftNudgeBpsPerSentiment: 30 }),
  },
];

function evaluateSim(ctx: SimContext): SimParams {
  return DT_SIM_01_ROWS.reduce(
    (acc, row) => (row.when(ctx) ? row.apply(acc) : acc),
    DT_SIM_01_DEFAULTS,
  );
}

export function simParamsForBeta(betaClass: BetaClass): SimParams {
  return evaluateSim({ betaClass, newsSentimentShock: false });
}

/** Annualized GBM σ by beta_class (doc 06 generator), before DT-SIM-01 vol_multiplier. */
const ANNUAL_SIGMA: Record<BetaClass, number> = {
  low: 0.15,
  medium: 0.28,
  high: 0.55,
};

export function annualSigma(betaClass: BetaClass): number {
  return ANNUAL_SIGMA[betaClass] * simParamsForBeta(betaClass).volMultiplier;
}

/**
 * DT-SIM-01 row 4: drift_nudge_bps = sentiment × cell when news_sentiment_shock is true.
 */
export function newsSentimentDriftNudgeBps(
  sentiment: number,
  newsSentimentShock: boolean,
  betaClass: BetaClass = "medium",
): number {
  const params = evaluateSim({ betaClass, newsSentimentShock });
  return sentiment * params.driftNudgeBpsPerSentiment;
}
