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

export {
  authorize,
  authorizeFromTable,
  authorizeResultFromOutcome,
  decisionFromOutcome,
  entitlementHttpStatus,
  type AuthorizePorts,
  type AuthorizeResult,
  type EntitlementDecision,
} from "./authorize";
export { handleAdminUsersRequest, type AdminUsersPorts } from "./admin-users";
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
export {
  BASELINE_TABLE_KEYS,
  DOMAIN_BINDINGS,
  baselineCatalog,
  baselineTable,
} from "./baseline-tables";
export { PublishedRulesCache, RULES_PUBLISHED_EVENT } from "./rules-cache";
export {
  assembleDecisionTable,
  evaluateDomain,
  handleRulesServiceRequest,
  resolveRulesServiceApiKey,
  type EvaluateDomainPorts,
  type EvaluateDomainResult,
  type PublishedDomainTable,
  type RuleAuditWrite,
  type RulesAdminPorts,
  type RulesServicePorts,
} from "./evaluate-domain";
export {
  diffDecisionTables,
  entitlementAllows,
  enumOptionsForInput,
  filterRuleAudits,
  groupTablesByDomain,
  inferConditionCellKind,
  reorderDecisionRows,
  requiredActionForAdminOp,
  simulateDraftAgainstAudits,
} from "./rules-admin";
export { compileAlertTemplate, defaultAlertName } from "./alert-templates";
export {
  alertConditionMatched,
  alertingDecisionFromOutcome,
  buildAlertMarketFacts,
  buildAlertThrottleFacts,
  minutesSince,
  runAlertCycle,
  utcDay,
  type AlertFireDraft,
  type AlertMarketContext,
  type AlertRuleSnapshot,
  type AlertRuleUpdate,
  type EvaluateAlerting,
} from "./alert-cycle";
export {
  createRulesAdminMemory,
  memoryAppendAudit,
  memoryGetTable,
  memoryListCatalog,
  memoryListHistory,
  memoryPublishDraft,
  memoryPublishedTables,
  memoryRollback,
  memorySaveDraft,
  type RulesAdminMemory,
} from "./rules-admin-memory";
