import {
  monitorPatchSchema,
  monitorSchema,
  type Monitor,
  type MonitorInsert,
  type MonitorPatch,
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
    insert(row: MonitorInsert) {
      return client.insert(recordTables.monitors, monitorSchema, [row]);
    },
    update(id: string, patch: MonitorPatch) {
      return client.update(
        recordTables.monitors,
        monitorSchema,
        { id: eqFilter(id) },
        monitorPatchSchema.parse(patch),
      );
    },
    remove(id: string) {
      return client.remove(recordTables.monitors, { id: eqFilter(id) });
    },
  };
}

export type MonitorsRepository = ReturnType<typeof createMonitorsRepository>;
export type { Monitor };
