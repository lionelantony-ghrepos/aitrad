import { orderRecordSchema, type OrderRecord } from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { recordTables } from "./rest";

export function createOrdersRepository(client: RecordsClient) {
  return {
    listMine() {
      return client.list(recordTables.orders, orderRecordSchema);
    },
    insert(row: OrderRecord) {
      return client.insert(recordTables.orders, orderRecordSchema, [orderRecordSchema.parse(row)]);
    },
  };
}

export type OrdersRepository = ReturnType<typeof createOrdersRepository>;
