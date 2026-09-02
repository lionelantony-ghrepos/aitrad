/**
 * Opening paper-account seed. Lives here until rules-service publishes a DT.
 * Do not copy the cash figure into UI or docs/kb.
 */
export type PaperAccountSeed = {
  currency: "USD";
  cashBalance: number;
};

type SeedRow = {
  match: boolean;
  currency: PaperAccountSeed["currency"];
  cashBalance: number;
};

/** FIRST-match seed table (product opening cash; not a docs/05 DT-* id). */
const PAPER_ACCOUNT_SEED_ROWS: readonly SeedRow[] = [
  { match: true, currency: "USD", cashBalance: 100_000 },
];

export function paperAccountSeed(): PaperAccountSeed {
  const row = PAPER_ACCOUNT_SEED_ROWS.find((candidate) => candidate.match);
  if (!row) {
    throw new Error("PAPER_ACCOUNT_SEED_MISSING");
  }
  return { currency: row.currency, cashBalance: row.cashBalance };
}
