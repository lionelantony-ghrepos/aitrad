export const packageName = "@meridian/rules-engine" as const;

/**
 * Decision-table evaluation belongs here (doc 05). Placeholder until PBI-010.
 * Application code must not hard-code policy thresholds.
 */
export function engineReady(): boolean {
  return true;
}
