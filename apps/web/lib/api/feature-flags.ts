import {
  featureFlagInsertSchema,
  featureFlagSchema,
  type FeatureFlagInsert,
} from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, recordTables } from "./rest";

export function createFeatureFlagsRepository(client: RecordsClient) {
  return {
    listVisible() {
      return client.list(recordTables.feature_flags, featureFlagSchema);
    },
    getByKey(key: string) {
      return client
        .list(recordTables.feature_flags, featureFlagSchema, { query: { key: eqFilter(key) } })
        .then((rows) => rows[0] ?? null);
    },
    insert(row: FeatureFlagInsert) {
      return client.insert(recordTables.feature_flags, featureFlagSchema, [
        featureFlagInsertSchema.parse(row),
      ]);
    },
  };
}

export type FeatureFlagsRepository = ReturnType<typeof createFeatureFlagsRepository>;
