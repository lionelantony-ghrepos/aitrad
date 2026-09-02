import {
  profileInsertSchema,
  profilePatchSchema,
  profileSchema,
  type ProfileInsert,
  type ProfilePatch,
} from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, recordTables } from "./rest";

export function createProfilesRepository(client: RecordsClient) {
  return {
    listMine() {
      return client.list(recordTables.profiles, profileSchema);
    },
    getById(id: string) {
      return client
        .list(recordTables.profiles, profileSchema, { query: { id: eqFilter(id) } })
        .then((rows) => rows[0] ?? null);
    },
    insert(row: ProfileInsert) {
      return client.insert(recordTables.profiles, profileSchema, [profileInsertSchema.parse(row)]);
    },
    updateById(id: string, patch: ProfilePatch) {
      return client.update(
        recordTables.profiles,
        profileSchema,
        { id: eqFilter(id) },
        profilePatchSchema.parse(patch),
      );
    },
  };
}

export type ProfilesRepository = ReturnType<typeof createProfilesRepository>;
