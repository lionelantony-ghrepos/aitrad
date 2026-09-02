/**
 * Authenticated-caller gate until PBI-024 evaluates DT-ENT-01.
 * Does not encode entitlement rows.
 */
export function authorize(input: { userId: string | null | undefined; action: string }): {
  allowed: boolean;
  reason?: string;
} {
  if (!input.userId) {
    return { allowed: false, reason: "UNAUTHENTICATED" };
  }
  if (input.action.length === 0) {
    return { allowed: false, reason: "ACTION_REQUIRED" };
  }
  return { allowed: true };
}
