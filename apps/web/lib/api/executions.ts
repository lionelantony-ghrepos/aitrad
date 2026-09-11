import { executionRecordSchema } from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, recordTables } from "./rest";

export function createExecutionsRepository(client: RecordsClient) {
  return {
    listMine() {
      return client.list(recordTables.executions, executionRecordSchema);
    },
    listByOrderId(orderId: string) {
      return client.list(recordTables.executions, executionRecordSchema, {
        query: { order_id: eqFilter(orderId) },
      });
    },
  };
}

export type ExecutionsRepository = ReturnType<typeof createExecutionsRepository>;
