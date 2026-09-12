import { describe, expect, it } from "vitest";
import { scriptedLlm } from "./fake-llm";
import { runCopilotRequest } from "./run-request";
import { assertOwnedCopilotSession, COPILOT_SESSION_NOT_FOUND } from "./session-access";

describe("copilot session ownership", () => {
  it("rejects missing and foreign sessions", () => {
    expect(() => assertOwnedCopilotSession({ session: null, userId: "u1" })).toThrow(
      COPILOT_SESSION_NOT_FOUND,
    );
    expect(() =>
      assertOwnedCopilotSession({ session: { user_id: "other" }, userId: "u1" }),
    ).toThrow(COPILOT_SESSION_NOT_FOUND);
    expect(() =>
      assertOwnedCopilotSession({ session: { user_id: "u1" }, userId: "u1" }),
    ).not.toThrow();
  });

  it("runCopilotRequest does not append when session_id is foreign", async () => {
    const appended: string[] = [];
    await expect(
      runCopilotRequest({
        request: {
          session_id: "11111111-1111-4111-8111-111111111111",
          message: "hello",
        },
        policyOutcome: { decision: "allow" },
        llm: scriptedLlm([{ content: "ok" }]),
        executeTool: async () => ({}),
        persist: {
          createSession: async () => {
            throw new Error("should not create");
          },
          appendMessage: async (row) => {
            appended.push(row.sessionId);
            throw new Error("should not append");
          },
          loadHistory: async () => {
            throw new Error(COPILOT_SESSION_NOT_FOUND);
          },
          auditTool: async () => {
            return;
          },
        },
      }),
    ).rejects.toThrow(COPILOT_SESSION_NOT_FOUND);
    expect(appended).toEqual([]);
  });
});
