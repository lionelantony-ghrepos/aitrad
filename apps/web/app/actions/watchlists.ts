"use server";

import { authorize } from "@meridian/rules-engine";
import {
  duplicateWatchlistItemMessage,
  instrumentSchema,
  quotesLatestSchema,
  watchlistInsertSchema,
  type Instrument,
  type QuotesLatest,
  type Watchlist,
  type WatchlistItem,
} from "@meridian/schemas";
import { createAuditLogRepository } from "@/lib/api/audit-log";
import { createRecordsClient } from "@/lib/api/client";
import { InsForgeApiError } from "@/lib/api/rest";
import { createInstrumentsRepository } from "@/lib/api/instruments";
import { createQuotesLatestRepository } from "@/lib/api/quotes-latest";
import { createWatchlistItemsRepository, createWatchlistsRepository } from "@/lib/api/watchlists";
import { isAuthStub } from "@/lib/auth/mode";
import { getAccessToken, getSessionUser } from "@/lib/auth/session";
import {
  stubAddWatchlistItem,
  stubCreateWatchlist,
  stubDeleteWatchlist,
  stubListWatchlistItems,
  stubListWatchlists,
  stubQuotesFor,
  stubRemoveWatchlistItem,
  stubRenameWatchlist,
  stubSearchInstruments,
  STUB_INSTRUMENTS,
} from "@/lib/auth/stub-store";
import { readPublicInsforgeEnv } from "@/lib/insforge/env";
import { findDuplicateInstrument } from "@/lib/watchlist/duplicate";

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

export async function listWatchlistsAction(): Promise<ActionResult<Watchlist[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = authorize({ userId: session.userId, action: "watchlist:list" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    return { ok: true, data: stubListWatchlists(session.userId) };
  }
  const data = await createWatchlistsRepository(records(session.token)).listMine();
  return { ok: true, data };
}

export async function createWatchlistAction(name: string): Promise<ActionResult<Watchlist>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const parsed = watchlistInsertSchema.safeParse({ user_id: session.userId, name: name.trim() });
  if (!parsed.success) {
    return { ok: false, message: "Enter a list name." };
  }
  const gate = authorize({ userId: session.userId, action: "watchlist:create" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    return { ok: true, data: stubCreateWatchlist(session.userId, parsed.data.name) };
  }
  const client = records(session.token);
  const created = await createWatchlistsRepository(client).insert(parsed.data);
  const row = created[0];
  if (!row) {
    return { ok: false, message: "Could not create list." };
  }
  await createAuditLogRepository(client).insert({
    user_id: session.userId,
    action: "watchlist:create",
    entity_type: "watchlists",
    entity_id: row.id,
    payload: { name: row.name },
  });
  return { ok: true, data: row };
}

export async function renameWatchlistAction(
  id: string,
  name: string,
): Promise<ActionResult<Watchlist>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: "Enter a list name." };
  }
  const gate = authorize({ userId: session.userId, action: "watchlist:update" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    const row = stubRenameWatchlist(session.userId, id, trimmed);
    return row ? { ok: true, data: row } : { ok: false, message: "List not found." };
  }
  const client = records(session.token);
  const updated = await createWatchlistsRepository(client).update(id, { name: trimmed });
  const row = updated[0];
  if (!row) {
    return { ok: false, message: "List not found." };
  }
  await createAuditLogRepository(client).insert({
    user_id: session.userId,
    action: "watchlist:update",
    entity_type: "watchlists",
    entity_id: row.id,
    payload: { name: row.name },
  });
  return { ok: true, data: row };
}

export async function deleteWatchlistAction(id: string): Promise<ActionResult<{ id: string }>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = authorize({ userId: session.userId, action: "watchlist:delete" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    const ok = stubDeleteWatchlist(session.userId, id);
    return ok ? { ok: true, data: { id } } : { ok: false, message: "List not found." };
  }
  const client = records(session.token);
  await createWatchlistsRepository(client).remove(id);
  await createAuditLogRepository(client).insert({
    user_id: session.userId,
    action: "watchlist:delete",
    entity_type: "watchlists",
    entity_id: id,
    payload: {},
  });
  return { ok: true, data: { id } };
}

export async function listWatchlistItemsAction(
  watchlistId: string,
): Promise<ActionResult<WatchlistItem[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = authorize({ userId: session.userId, action: "watchlist:item:list" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    return { ok: true, data: stubListWatchlistItems(session.userId, watchlistId) };
  }
  const data = await createWatchlistItemsRepository(records(session.token)).listByWatchlist(
    watchlistId,
  );
  return { ok: true, data };
}

export async function addWatchlistItemAction(
  watchlistId: string,
  instrumentId: string,
  symbol: string,
): Promise<ActionResult<WatchlistItem>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = authorize({ userId: session.userId, action: "watchlist:item:create" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    try {
      const existing = stubListWatchlistItems(session.userId, watchlistId);
      if (findDuplicateInstrument(existing, instrumentId)) {
        return { ok: false, message: duplicateWatchlistItemMessage(symbol) };
      }
      return { ok: true, data: stubAddWatchlistItem(session.userId, watchlistId, instrumentId) };
    } catch (error) {
      if (error instanceof Error && error.message === "DUPLICATE_WATCHLIST_ITEM") {
        return { ok: false, message: duplicateWatchlistItemMessage(symbol) };
      }
      throw error;
    }
  }
  const client = records(session.token);
  const items = createWatchlistItemsRepository(client);
  const existing = await items.listByWatchlist(watchlistId);
  if (findDuplicateInstrument(existing, instrumentId)) {
    return { ok: false, message: duplicateWatchlistItemMessage(symbol) };
  }
  try {
    const created = await items.insert({
      watchlist_id: watchlistId,
      instrument_id: instrumentId,
      sort_order: existing.length,
    });
    const row = created[0];
    if (!row) {
      return { ok: false, message: "Could not add symbol." };
    }
    await createAuditLogRepository(client).insert({
      user_id: session.userId,
      action: "watchlist:item:create",
      entity_type: "watchlist_items",
      entity_id: row.id,
      payload: { symbol, watchlist_id: watchlistId },
    });
    return { ok: true, data: row };
  } catch (error) {
    if (uniqueViolation(error)) {
      return { ok: false, message: duplicateWatchlistItemMessage(symbol) };
    }
    throw error;
  }
}

export async function removeWatchlistItemAction(
  itemId: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = authorize({ userId: session.userId, action: "watchlist:item:delete" });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    const ok = stubRemoveWatchlistItem(session.userId, itemId);
    return ok ? { ok: true, data: { id: itemId } } : { ok: false, message: "Row not found." };
  }
  const client = records(session.token);
  await createWatchlistItemsRepository(client).remove(itemId);
  await createAuditLogRepository(client).insert({
    user_id: session.userId,
    action: "watchlist:item:delete",
    entity_type: "watchlist_items",
    entity_id: itemId,
    payload: {},
  });
  return { ok: true, data: { id: itemId } };
}

export async function searchInstrumentsAction(query: string): Promise<ActionResult<Instrument[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  if (isAuthStub()) {
    return { ok: true, data: stubSearchInstruments(query) };
  }
  const repo = createInstrumentsRepository(records(session.token));
  if (query.trim().length === 0) {
    return { ok: true, data: [] };
  }
  const data = await repo.list({ symbolIlike: query.trim() });
  return { ok: true, data: data.map((row) => instrumentSchema.parse(row)) };
}

export async function listQuotesAction(
  instrumentIds: string[],
): Promise<ActionResult<QuotesLatest[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  if (isAuthStub()) {
    return { ok: true, data: stubQuotesFor(instrumentIds) };
  }
  const data = await createQuotesLatestRepository(records(session.token)).listByInstrumentIds(
    instrumentIds,
  );
  return { ok: true, data: data.map((row) => quotesLatestSchema.parse(row)) };
}

export async function resolveInstrumentsAction(
  instrumentIds: string[],
): Promise<ActionResult<Instrument[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  if (isAuthStub()) {
    return {
      ok: true,
      data: STUB_INSTRUMENTS.filter((row) => instrumentIds.includes(row.id)),
    };
  }
  const repo = createInstrumentsRepository(records(session.token));
  const rows: Instrument[] = [];
  for (const id of instrumentIds) {
    const row = await repo.getById(id);
    if (row) {
      rows.push(row);
    }
  }
  return { ok: true, data: rows };
}
