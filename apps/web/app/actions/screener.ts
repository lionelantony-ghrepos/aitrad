"use server";

import { authorize } from "@meridian/rules-engine";
import {
  screenerCriteriaSchema,
  screenInsertSchema,
  screenPatchSchema,
  screenerRunRequestSchema,
  type ScreenRecord,
  type ScreenerCountResponse,
  type ScreenerCriteria,
  type ScreenerRunResponse,
} from "@meridian/schemas";
import { createAuditLogRepository } from "@/lib/api/audit-log";
import { createRecordsClient } from "@/lib/api/client";
import { invokeScreenerRun } from "@/lib/api/screener";
import { InsForgeApiError } from "@/lib/api/rest";
import { createScreensRepository } from "@/lib/api/screens";
import { createWatchlistItemsRepository, createWatchlistsRepository } from "@/lib/api/watchlists";
import { isAuthStub } from "@/lib/auth/mode";
import { getAccessToken, getSessionUser } from "@/lib/auth/session";
import {
  stubAddWatchlistItem,
  stubDeleteScreen,
  stubListScreens,
  stubListWatchlistItems,
  stubListWatchlists,
  stubRunScreener,
  stubSaveScreen,
} from "@/lib/auth/stub-store";
import { findDuplicateInstrument } from "@/lib/watchlist/duplicate";
import { readPublicInsforgeEnv } from "@/lib/insforge/env";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; message: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

async function requireUser(): Promise<
  { ok: true; userId: string; token: string } | { ok: false; message: string }
> {
  const user = await getSessionUser();
  const token = await getAccessToken();
  if (!user || !token) {
    return { ok: false, message: "You must be signed in." };
  }
  return { ok: true, userId: user.id, token };
}

function records(token: string) {
  const env = readPublicInsforgeEnv();
  return createRecordsClient({
    baseUrl: env.baseUrl,
    getAccessToken: () => token,
  });
}

function uniqueViolation(error: unknown): boolean {
  if (error instanceof InsForgeApiError) {
    return error.status === 409 || /unique|duplicate/i.test(error.message);
  }
  return false;
}

export async function runScreenerAction(
  input: unknown,
): Promise<ActionResult<ScreenerRunResponse | ScreenerCountResponse>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = authorize({ userId: session.userId, action: "screener:run" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  const parsed = screenerRunRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid criteria." };
  }
  if (isAuthStub()) {
    const ran = stubRunScreener(parsed.data);
    if (parsed.data.op === "count") {
      return { ok: true, data: { count: ran.count, truncated: ran.truncated } };
    }
    return { ok: true, data: ran };
  }
  try {
    const env = readPublicInsforgeEnv();
    const data = await invokeScreenerRun({
      baseUrl: env.baseUrl,
      accessToken: session.token,
      request: parsed.data,
    });
    return { ok: true, data };
  } catch {
    return { ok: false, message: "Screener run failed." };
  }
}

export async function listScreensAction(): Promise<ActionResult<ScreenRecord[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = authorize({ userId: session.userId, action: "screener:list" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    return { ok: true, data: stubListScreens(session.userId) };
  }
  const data = await createScreensRepository(records(session.token)).listMine();
  return { ok: true, data };
}

export async function saveScreenAction(input: {
  id?: string;
  name: string;
  criteria: ScreenerCriteria;
}): Promise<ActionResult<ScreenRecord>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = authorize({ userId: session.userId, action: "screener:save" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  const criteria = screenerCriteriaSchema.safeParse(input.criteria);
  if (!criteria.success) {
    return { ok: false, message: "Invalid criteria." };
  }
  const name = input.name.trim();
  if (name.length === 0) {
    return { ok: false, message: "Name is required." };
  }
  if (isAuthStub()) {
    try {
      return { ok: true, data: stubSaveScreen(session.userId, name, criteria.data, input.id) };
    } catch {
      return { ok: false, message: "Could not save screen." };
    }
  }
  const client = records(session.token);
  const repo = createScreensRepository(client);
  try {
    if (input.id) {
      const patch = screenPatchSchema.parse({ name, criteria: criteria.data });
      const updated = await repo.update(input.id, patch);
      const row = updated[0];
      if (!row) {
        return { ok: false, message: "Screen not found." };
      }
      await createAuditLogRepository(client).insert({
        user_id: session.userId,
        action: "screener:save",
        entity_type: "screens",
        entity_id: row.id,
        payload: { name },
      });
      return { ok: true, data: row };
    }
    const insert = screenInsertSchema.parse({
      user_id: session.userId,
      name,
      criteria: criteria.data,
    });
    const created = await repo.insert(insert);
    const row = created[0];
    if (!row) {
      return { ok: false, message: "Could not save screen." };
    }
    await createAuditLogRepository(client).insert({
      user_id: session.userId,
      action: "screener:save",
      entity_type: "screens",
      entity_id: row.id,
      payload: { name },
    });
    return { ok: true, data: row };
  } catch (error) {
    if (uniqueViolation(error)) {
      return { ok: false, message: "A screen with that name already exists." };
    }
    throw error;
  }
}

export async function deleteScreenAction(id: string): Promise<ActionResult<{ id: string }>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = authorize({ userId: session.userId, action: "screener:delete" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    const ok = stubDeleteScreen(session.userId, id);
    return ok ? { ok: true, data: { id } } : { ok: false, message: "Screen not found." };
  }
  const client = records(session.token);
  await createScreensRepository(client).remove(id);
  await createAuditLogRepository(client).insert({
    user_id: session.userId,
    action: "screener:delete",
    entity_type: "screens",
    entity_id: id,
    payload: {},
  });
  return { ok: true, data: { id } };
}

export async function addScreenerResultsToWatchlistAction(input: {
  watchlistId: string;
  instruments: Array<{ instrument_id: string; symbol: string }>;
}): Promise<ActionResult<{ added: number; skipped: number }>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = authorize({ userId: session.userId, action: "watchlist:item:create" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (input.instruments.length === 0) {
    return { ok: false, message: "No results to add." };
  }
  if (isAuthStub()) {
    const lists = stubListWatchlists(session.userId);
    if (!lists.some((row) => row.id === input.watchlistId)) {
      return { ok: false, message: "Watchlist not found." };
    }
    let added = 0;
    let skipped = 0;
    for (const item of input.instruments) {
      const existing = stubListWatchlistItems(session.userId, input.watchlistId);
      if (findDuplicateInstrument(existing, item.instrument_id)) {
        skipped += 1;
        continue;
      }
      stubAddWatchlistItem(session.userId, input.watchlistId, item.instrument_id);
      added += 1;
    }
    return { ok: true, data: { added, skipped } };
  }
  const client = records(session.token);
  const watchlist = await createWatchlistsRepository(client).getById(input.watchlistId);
  if (!watchlist || watchlist.user_id !== session.userId) {
    return { ok: false, message: "Watchlist not found." };
  }
  const items = createWatchlistItemsRepository(client);
  const existing = await items.listByWatchlist(input.watchlistId);
  let added = 0;
  let skipped = 0;
  let sortOrder = existing.length;
  for (const item of input.instruments) {
    if (findDuplicateInstrument(existing, item.instrument_id)) {
      skipped += 1;
      continue;
    }
    try {
      const created = await items.insert({
        watchlist_id: input.watchlistId,
        instrument_id: item.instrument_id,
        sort_order: sortOrder,
      });
      const row = created[0];
      if (!row) {
        skipped += 1;
        continue;
      }
      existing.push(row);
      sortOrder += 1;
      added += 1;
      await createAuditLogRepository(client).insert({
        user_id: session.userId,
        action: "watchlist:item:create",
        entity_type: "watchlist_items",
        entity_id: row.id,
        payload: { symbol: item.symbol, watchlist_id: input.watchlistId, source: "screener" },
      });
    } catch (error) {
      if (uniqueViolation(error)) {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }
  return { ok: true, data: { added, skipped } };
}

export async function listScreenerWatchlistsAction() {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = authorize({ userId: session.userId, action: "watchlist:list" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." } as const;
  }
  if (isAuthStub()) {
    return { ok: true as const, data: stubListWatchlists(session.userId) };
  }
  const data = await createWatchlistsRepository(records(session.token)).listMine();
  return { ok: true as const, data };
}
