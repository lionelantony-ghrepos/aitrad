import { evaluate, type DecisionTable } from "./evaluate";

export type EntitlementDecision = "allow" | "deny" | "require_approval";

export type AuthorizeResult = {
  allowed: boolean;
  decision: EntitlementDecision;
  reason?: string;
};

export type AuthorizePorts = {
  loadRole: (userId: string) => Promise<string | null>;
  evaluateEntitlements: (context: {
    role: string;
    action: string;
  }) => Promise<{ outcome: unknown }>;
};

export function decisionFromOutcome(outcome: unknown): EntitlementDecision {
  if (!outcome || typeof outcome !== "object" || !("decision" in outcome)) {
    return "deny";
  }
  const decision = (outcome as { decision?: unknown }).decision;
  if (decision === "allow" || decision === "deny" || decision === "require_approval") {
    return decision;
  }
  return "deny";
}

export function authorizeResultFromOutcome(outcome: unknown): AuthorizeResult {
  const decision = decisionFromOutcome(outcome);
  return {
    allowed: decision === "allow",
    decision,
    reason: decision === "allow" ? undefined : "FORBIDDEN",
  };
}

export function authorizeFromTable(input: {
  userId: string | null | undefined;
  action: string;
  role?: string | null;
  table: DecisionTable;
  clock?: Date;
}): AuthorizeResult {
  if (!input.userId) {
    return { allowed: false, decision: "deny", reason: "UNAUTHENTICATED" };
  }
  if (input.action.length === 0) {
    return { allowed: false, decision: "deny", reason: "ACTION_REQUIRED" };
  }
  const role = input.role && input.role.length > 0 ? input.role : "unknown";
  const result = evaluate(input.table, { role, action: input.action }, input.clock ?? new Date());
  return authorizeResultFromOutcome(result.outcome);
}

/**
 * JWT caller + action → DT-ENT-01 via `evaluateDomain('entitlements')` ports.
 * Deny-by-default when role or table is missing.
 */
export async function authorize(input: {
  userId: string | null | undefined;
  action: string;
  ports?: AuthorizePorts;
  role?: string | null;
  table?: DecisionTable;
  clock?: Date;
}): Promise<AuthorizeResult> {
  if (!input.userId) {
    return { allowed: false, decision: "deny", reason: "UNAUTHENTICATED" };
  }
  if (input.action.length === 0) {
    return { allowed: false, decision: "deny", reason: "ACTION_REQUIRED" };
  }

  if (input.ports) {
    const role = (await input.ports.loadRole(input.userId)) ?? "unknown";
    const evaluated = await input.ports.evaluateEntitlements({ role, action: input.action });
    return authorizeResultFromOutcome(evaluated.outcome);
  }

  if (input.table) {
    return authorizeFromTable({
      userId: input.userId,
      action: input.action,
      role: input.role,
      table: input.table,
      clock: input.clock,
    });
  }

  return { allowed: false, decision: "deny", reason: "FORBIDDEN" };
}

export function entitlementHttpStatus(result: AuthorizeResult): 200 | 401 | 403 {
  if (result.reason === "UNAUTHENTICATED") {
    return 401;
  }
  return result.allowed ? 200 : 403;
}
