import { positionRecordSchema, portfolioSnapshotSchema } from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { recordTables } from "./rest";

export function createPositionsRepository(client: RecordsClient) {
  return {
    listMine() {
      return client.list(recordTables.positions, positionRecordSchema);
    },
  };
}

export function createPortfolioSnapshotsRepository(client: RecordsClient) {
  return {
    listMine() {
      return client.list(recordTables.portfolio_snapshots, portfolioSnapshotSchema);
    },
  };
}

export type PositionsRepository = ReturnType<typeof createPositionsRepository>;
export type PortfolioSnapshotsRepository = ReturnType<typeof createPortfolioSnapshotsRepository>;
