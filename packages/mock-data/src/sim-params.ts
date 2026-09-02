import type { BetaClass } from "@meridian/schemas";

/**
 * DT-SIM-01 (ALL merge) as a local table until rules-service publishes it (PBI-010).
 * Do not copy these cells into UI or docs/kb.
 */
export type SimParams = {
  gapEventProbPerDay: number;
  gapRangePct: readonly [number, number];
  volMultiplier: number;
};

type SimContext = { betaClass: BetaClass };

type DtSim01Row = {
  when: (ctx: SimContext) => boolean;
  apply: (acc: SimParams) => SimParams;
};

const DT_SIM_01_DEFAULTS: SimParams = {
  gapEventProbPerDay: 0,
  gapRangePct: [0, 0],
  volMultiplier: 1,
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
];

export function simParamsForBeta(betaClass: BetaClass): SimParams {
  return DT_SIM_01_ROWS.reduce(
    (acc, row) => (row.when({ betaClass }) ? row.apply(acc) : acc),
    DT_SIM_01_DEFAULTS,
  );
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
