export const COPILOT_SESSION_NOT_FOUND = "SESSION_NOT_FOUND";

export function assertOwnedCopilotSession<T extends { user_id: string }>(input: {
  session: T | null | undefined;
  userId: string;
}): asserts input is { session: T; userId: string } {
  if (!input.session || input.session.user_id !== input.userId) {
    throw new Error(COPILOT_SESSION_NOT_FOUND);
  }
}
