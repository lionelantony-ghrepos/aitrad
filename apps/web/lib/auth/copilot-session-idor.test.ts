import { afterEach, describe, expect, it } from "vitest";
import { COPILOT_SESSION_NOT_FOUND } from "@meridian/copilot";
import {
  resetStubState,
  stubAppendCopilotMessage,
  stubCreateCopilotSession,
  stubListCopilotMessages,
} from "./stub-store";

const OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("stub copilot session IDOR", () => {
  afterEach(() => {
    resetStubState();
  });

  it("rejects loadHistory and appendMessage for missing or foreign sessions", () => {
    const owned = stubCreateCopilotSession(OWNER, "mine");
    expect(() => stubListCopilotMessages(OWNER, crypto.randomUUID())).toThrow(
      COPILOT_SESSION_NOT_FOUND,
    );
    expect(() => stubListCopilotMessages(OTHER, owned.id)).toThrow(COPILOT_SESSION_NOT_FOUND);
    expect(() =>
      stubAppendCopilotMessage({
        userId: OTHER,
        sessionId: owned.id,
        role: "user",
        content: "steal",
        tool_calls: [],
      }),
    ).toThrow(COPILOT_SESSION_NOT_FOUND);
    expect(stubListCopilotMessages(OWNER, owned.id)).toEqual([]);
  });
});
