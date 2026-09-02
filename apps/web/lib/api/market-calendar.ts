import { marketCalendarRowSchema } from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { recordTables } from "./rest";

export function createMarketCalendarRepository(client: RecordsClient) {
  return {
    listSessions() {
      return client.list(recordTables.market_calendar, marketCalendarRowSchema);
    },
  };
}

export type MarketCalendarRepository = ReturnType<typeof createMarketCalendarRepository>;
