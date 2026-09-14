import { copilotActionSchema, type CopilotAction } from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, recordTables } from "./rest";

export function createCopilotActionsRepository(client: RecordsClient) {
  return {
    listMine() {
      return client.list(recordTables.copilot_actions, copilotActionSchema, {
        query: { order: "created_at.asc" },
      });
    },
    listBySession(sessionId: string) {
      return client.list(recordTables.copilot_actions, copilotActionSchema, {
        query: { session_id: eqFilter(sessionId), order: "created_at.asc" },
      });
    },
    getById(id: string) {
      return client
        .list(recordTables.copilot_actions, copilotActionSchema, {
          query: { id: eqFilter(id) },
        })
        .then((rows) => rows[0] ?? null);
    },
    insert(row: CopilotAction) {
      return client.insert(recordTables.copilot_actions, copilotActionSchema, [row]);
    },
    update(id: string, patch: Partial<CopilotAction>) {
      return client.update(
        recordTables.copilot_actions,
        copilotActionSchema,
        { id: eqFilter(id) },
        patch,
      );
    },
  };
}

export type CopilotActionsRepository = ReturnType<typeof createCopilotActionsRepository>;
