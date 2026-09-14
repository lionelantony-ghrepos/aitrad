export const COPILOT_SESSION_NOT_FOUND = "SESSION_NOT_FOUND";

export function assertOwnedCopilotSession<T extends { user_id: string }>(input: {
  session: T | null | undefined;
  userId: string;
}): asserts input is { session: T; userId: string } {
  if (!input.session || input.session.user_id !== input.userId) {
    throw new Error(COPILOT_SESSION_NOT_FOUND);
  }
}

/**
 * Defense-in-depth before any admin insert into `copilot_actions`.
 * Callers must still load the session with `user_id = authenticated user`.
 */
export async function persistOwnedCopilotAction<
  T extends { user_id: string; session_id: string },
>(input: {
  userId: string;
  row: T;
  requireOwnedSession: (sessionId: string) => Promise<void>;
  insert: (row: T) => Promise<T>;
}): Promise<T> {
  if (input.row.user_id !== input.userId) {
    throw new Error(COPILOT_SESSION_NOT_FOUND);
  }
  await input.requireOwnedSession(input.row.session_id);
  return input.insert(input.row);
}
