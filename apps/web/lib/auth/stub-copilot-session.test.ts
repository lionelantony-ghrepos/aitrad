import { afterEach, describe, expect, it } from "vitest";
import {
  resetStubState,
  stubAppendCopilotMessage,
  stubCreateCopilotSession,
  stubListCopilotMessages,
} from "./stub-store";

describe("stub copilot session ownership (Path A / E2E)", () => {
  afterEach(() => {
    resetStubState();
  });

  it("appends and lists only on sessions owned by the caller", () => {
    const mine = stubCreateCopilotSession("user-a", "Mine");
    const row = stubAppendCopilotMessage({
      userId: "user-a",
      sessionId: mine.id,
      role: "user",
      content: "hello",
      tool_calls: [],
    });
    expect(row.session_id).toBe(mine.id);
    expect(stubListCopilotMessages("user-a", mine.id)).toHaveLength(1);
  });

  it("rejects append on a foreign or missing session", () => {
    const theirs = stubCreateCopilotSession("user-b", "Theirs");
    expect(() =>
      stubAppendCopilotMessage({
        userId: "user-a",
        sessionId: theirs.id,
        role: "user",
        content: "inject",
        tool_calls: [],
      }),
    ).toThrow("SESSION_NOT_FOUND");
    expect(() =>
      stubAppendCopilotMessage({
        userId: "user-a",
        sessionId: "00000000-0000-4000-8000-000000000099",
        role: "user",
        content: "missing",
        tool_calls: [],
      }),
    ).toThrow("SESSION_NOT_FOUND");
  });

  it("rejects history load on a foreign or missing session", () => {
    const theirs = stubCreateCopilotSession("user-b", "Theirs");
    stubAppendCopilotMessage({
      userId: "user-b",
      sessionId: theirs.id,
      role: "user",
      content: "secret",
      tool_calls: [],
    });
    expect(() => stubListCopilotMessages("user-a", theirs.id)).toThrow("SESSION_NOT_FOUND");
    expect(() => stubListCopilotMessages("user-a", "00000000-0000-4000-8000-000000000099")).toThrow(
      "SESSION_NOT_FOUND",
    );
  });
});
