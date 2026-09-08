export const packageName = "@meridian/paper-engine" as const;

/** Paper matching lives here (pure, no I/O). Placeholder until PBI-015. */
export function matcherReady(): boolean {
  return true;
}

export { notionalFromShares, referencePrice, sharesFromNotional } from "./qty-mode";
export {
  applyFeeSchedule,
  assemblePreview,
  buildOrderFacts,
  reasonFromOutcome,
  summarizeRisk,
  summarizeValidation,
  type OrderFactInput,
  type OrderFacts,
} from "./preview";
