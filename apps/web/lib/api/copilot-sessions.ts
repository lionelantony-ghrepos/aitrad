import {
  copilotMessageSchema,
  copilotSessionSchema,
  type CopilotMessage,
  type CopilotSession,
} from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, recordTables } from "./rest";

export function createCopilotSessionsRepository(client: RecordsClient) {
  return {
    listMine() {
      return client.list(recordTables.copilot_sessions, copilotSessionSchema, {
        query: { order: "updated_at.desc" },
      });
    },
    listMessages(sessionId: string) {
      return client.list(recordTables.copilot_messages, copilotMessageSchema, {
        query: { session_id: eqFilter(sessionId), order: "created_at.asc" },
      });
    },
  };
}

export type CopilotSessionsRepository = ReturnType<typeof createCopilotSessionsRepository>;

export type { CopilotSession, CopilotMessage };
