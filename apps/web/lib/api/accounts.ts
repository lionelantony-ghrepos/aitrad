import {
  accountInsertSchema,
  accountPatchSchema,
  accountSchema,
  type AccountInsert,
  type AccountPatch,
} from "@meridian/schemas";
import type { RecordsClient } from "./client";
import { eqFilter, recordTables } from "./rest";

export function createAccountsRepository(client: RecordsClient) {
  return {
    listMine() {
      return client.list(recordTables.accounts, accountSchema);
    },
    getById(id: string) {
      return client
        .list(recordTables.accounts, accountSchema, { query: { id: eqFilter(id) } })
        .then((rows) => rows[0] ?? null);
    },
    insert(row: AccountInsert) {
      return client.insert(recordTables.accounts, accountSchema, [accountInsertSchema.parse(row)]);
    },
    updateById(id: string, patch: AccountPatch) {
      return client.update(
        recordTables.accounts,
        accountSchema,
        { id: eqFilter(id) },
        accountPatchSchema.parse(patch),
      );
    },
  };
}

export type AccountsRepository = ReturnType<typeof createAccountsRepository>;
