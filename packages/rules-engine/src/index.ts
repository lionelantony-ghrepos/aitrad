export const packageName = "@meridian/rules-engine" as const;

/**
 * Decision-table evaluation (doc 05). Application code must not hard-code policy thresholds.
 */
export function engineReady(): boolean {
  return true;
}

export {
  compile,
  decisionTableSchema,
  evaluate,
  type CompiledTable,
  type ConditionOperator,
  type DecisionCondition,
  type DecisionRow,
  type DecisionTable,
  type EvaluationContext,
  type EvaluationResult,
  type HitPolicy,
  type TraceCell,
  type TraceEntry,
} from "./evaluate";

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
