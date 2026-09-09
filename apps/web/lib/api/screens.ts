import {
  screenInsertSchema,
  screenPatchSchema,
  screenRecordSchema,
  type ScreenInsert,
  type ScreenPatch,
  type ScreenRecord,
} from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, recordTables } from "./rest";

export function createScreensRepository(client: RecordsClient) {
  return {
    listMine() {
      return client.list(recordTables.screens, screenRecordSchema);
    },
    getById(id: string) {
      return client
        .list(recordTables.screens, screenRecordSchema, { query: { id: eqFilter(id) } })
        .then((rows) => rows[0] ?? null);
    },
    insert(row: ScreenInsert) {
      return client.insert(recordTables.screens, screenRecordSchema, [
        screenInsertSchema.parse(row),
      ]);
    },
    update(id: string, patch: ScreenPatch) {
      return client.update(
        recordTables.screens,
        screenRecordSchema,
        { id: eqFilter(id) },
        screenPatchSchema.parse(patch),
      );
    },
    remove(id: string) {
      return client.remove(recordTables.screens, { id: eqFilter(id) });
    },
  };
}

export type ScreensRepository = ReturnType<typeof createScreensRepository>;
export type { ScreenRecord };
