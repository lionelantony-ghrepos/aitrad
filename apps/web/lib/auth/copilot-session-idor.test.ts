import { afterEach, describe, expect, it } from "vitest";
import { COPILOT_SESSION_NOT_FOUND } from "@meridian/copilot";
import {
  resetStubState,
  stubAppendCopilotMessage,
  stubCreateCopilotSession,
  stubInsertCopilotAction,
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

  it("rejects stub copilot_actions insert on a foreign session", () => {
    const owned = stubCreateCopilotSession(OWNER, "mine");
    expect(() =>
      stubInsertCopilotAction({
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        user_id: OTHER,
        session_id: owned.id,
        tool: "create_watchlist_item",
        payload: { symbol: "NVDA" },
        policy_outcome: { decision: "auto_approve" },
        status: "auto_approved",
        executed_ref: null,
        reject_reason: null,
        created_at: "2026-09-14T00:00:00.000Z",
        updated_at: "2026-09-14T00:00:00.000Z",
      }),
    ).toThrow(COPILOT_SESSION_NOT_FOUND);
  });
});
