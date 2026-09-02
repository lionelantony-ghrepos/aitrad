export const packageName = "@meridian/rules-engine" as const;

/**
 * Decision-table evaluation belongs here (doc 05). Placeholder until PBI-010.
 * Application code must not hard-code policy thresholds.
 */
export function engineReady(): boolean {
  return true;
}

export { authorize } from "./authorize";
export { paperAccountSeed } from "./paper-account-seed";
export {
  executeProvision,
  planProvision,
  ProvisionDeniedError,
  type ExistingProvision,
  type ProvisionAccountRow,
  type ProvisionPlan,
  type ProvisionPorts,
  type ProvisionProfileRow,
} from "./provision-plan";
export { isProfileWizardComplete, profileWizardPatch } from "./profile-wizard";
