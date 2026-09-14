import {
  monitorOwnerPatchSchema,
  monitorSchema,
  type Monitor,
  type MonitorInsert,
  type MonitorOwnerPatch,
} from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, recordTables } from "./rest";

export function createMonitorsRepository(client: RecordsClient) {
  return {
    listMine() {
      return client.list(recordTables.monitors, monitorSchema, {
        query: { order: "created_at.desc" },
      });
    },
    get(id: string) {
      return client.list(recordTables.monitors, monitorSchema, {
        query: { id: eqFilter(id) },
      });
    },
    insert(row: MonitorInsert) {
      return client.insert(recordTables.monitors, monitorSchema, [row]);
    },
    update(id: string, patch: MonitorOwnerPatch) {
      return client.update(
        recordTables.monitors,
        monitorSchema,
        { id: eqFilter(id) },
        monitorOwnerPatchSchema.parse(patch),
      );
    },
    remove(id: string) {
      return client.remove(recordTables.monitors, { id: eqFilter(id) });
    },
  };
}

export type MonitorsRepository = ReturnType<typeof createMonitorsRepository>;
export type { Monitor };
