import { paperAccountSeed } from "@meridian/rules-engine";
import type {
  Account,
  Instrument,
  Profile,
  QuotesLatest,
  Watchlist,
  WatchlistItem,
} from "@meridian/schemas";

export type StubUser = {
  id: string;
  email: string;
  password: string;
};

type StubState = {
  usersByEmail: Map<string, StubUser>;
  usersById: Map<string, StubUser>;
  profiles: Map<string, Profile>;
  accounts: Map<string, Account>;
  watchlists: Watchlist[];
  watchlistItems: WatchlistItem[];
};

function createState(): StubState {
  return {
    usersByEmail: new Map(),
    usersById: new Map(),
    profiles: new Map(),
    accounts: new Map(),
    watchlists: [],
    watchlistItems: [],
  };
}

const globalForStub = globalThis as typeof globalThis & { __meridianAuthStub?: StubState };

export function getStubState(): StubState {
  if (!globalForStub.__meridianAuthStub) {
    globalForStub.__meridianAuthStub = createState();
  }
  return globalForStub.__meridianAuthStub;
}

export function resetStubState(): void {
  globalForStub.__meridianAuthStub = createState();
}

function nowIso(): string {
  return new Date().toISOString();
}

export function stubSignUp(email: string, password: string): StubUser {
  const state = getStubState();
  const key = email.toLowerCase();
  const existing = state.usersByEmail.get(key);
  if (existing) {
    throw new Error("EMAIL_TAKEN");
  }
  const user: StubUser = { id: crypto.randomUUID(), email: key, password };
  state.usersByEmail.set(key, user);
  state.usersById.set(user.id, user);
  return user;
}

export function stubSignIn(email: string, password: string): StubUser {
  const user = getStubState().usersByEmail.get(email.toLowerCase());
  if (!user || user.password !== password) {
    throw new Error("INVALID_CREDENTIALS");
  }
  return user;
}

export function stubOauthUser(email: string): StubUser {
  const state = getStubState();
  const key = email.toLowerCase();
  const existing = state.usersByEmail.get(key);
  if (existing) {
    return existing;
  }
  const user: StubUser = { id: crypto.randomUUID(), email: key, password: "" };
  state.usersByEmail.set(key, user);
  state.usersById.set(user.id, user);
  return user;
}

export function stubGetUser(userId: string): StubUser | null {
  return getStubState().usersById.get(userId) ?? null;
}

export function stubLoadProvision(userId: string): {
  profile: Profile | null;
  account: Account | null;
} {
  const state = getStubState();
  return {
    profile: state.profiles.get(userId) ?? null,
    account: state.accounts.get(userId) ?? null,
  };
}

export function stubInsertProfile(userId: string): Profile {
  const ts = nowIso();
  const row: Profile = {
    id: crypto.randomUUID(),
    user_id: userId,
    display_name: null,
    persona: null,
    experience_level: null,
    suitability_tier: null,
    objectives: null,
    created_at: ts,
    updated_at: ts,
  };
  getStubState().profiles.set(userId, row);
  return row;
}

export function stubInsertAccount(userId: string): Account {
  const seed = paperAccountSeed();
  const ts = nowIso();
  const row: Account = {
    id: crypto.randomUUID(),
    user_id: userId,
    cash_balance: seed.cashBalance,
    currency: seed.currency,
    created_at: ts,
    updated_at: ts,
  };
  getStubState().accounts.set(userId, row);
  return row;
}

export function stubPatchProfile(userId: string, patch: Partial<Profile>): Profile {
  const current = getStubState().profiles.get(userId);
  if (!current) {
    throw new Error("PROFILE_MISSING");
  }
  const next: Profile = {
    ...current,
    ...patch,
    id: current.id,
    user_id: current.user_id,
    updated_at: nowIso(),
  };
  getStubState().profiles.set(userId, next);
  return next;
}

export function stubAccountCount(userId: string): number {
  return getStubState().accounts.has(userId) ? 1 : 0;
}

export const STUB_AAPL_INSTRUMENT_ID = "11111111-1111-4111-8111-111111111111";
export const STUB_MSFT_INSTRUMENT_ID = "22222222-2222-4222-8222-222222222222";

const STUB_TS = "2026-09-04T13:30:00.000Z";

function marketInstrument(id: string, symbol: string, name: string): Instrument {
  return {
    id,
    symbol,
    name,
    exchange: "NASDAQ",
    sector: "Technology",
    industry: "Software",
    status: "active",
    currency: "USD",
    tick_size: 0.01,
    lot_size: 1,
    created_at: STUB_TS,
    updated_at: STUB_TS,
  };
}

export const STUB_INSTRUMENTS: Instrument[] = [
  marketInstrument(STUB_AAPL_INSTRUMENT_ID, "AAPL", "Apple Inc."),
  marketInstrument(STUB_MSFT_INSTRUMENT_ID, "MSFT", "Microsoft Corporation"),
];

export const STUB_QUOTES: QuotesLatest[] = [
  {
    instrument_id: STUB_AAPL_INSTRUMENT_ID,
    bid: 189.5,
    ask: 189.7,
    last: 189.6,
    prev_close: 185,
    volume: 1_000_000,
    ts: STUB_TS,
  },
  {
    instrument_id: STUB_MSFT_INSTRUMENT_ID,
    bid: 419.8,
    ask: 420.1,
    last: 420,
    prev_close: 415,
    volume: 800_000,
    ts: STUB_TS,
  },
];

export function stubSearchInstruments(query: string): Instrument[] {
  const q = query.trim().toUpperCase();
  if (q.length === 0) {
    return [];
  }
  return STUB_INSTRUMENTS.filter(
    (row) => row.symbol.includes(q) || row.name.toUpperCase().includes(q),
  );
}

export function stubListWatchlists(userId: string): Watchlist[] {
  return getStubState().watchlists.filter((row) => row.user_id === userId);
}

export function stubCreateWatchlist(userId: string, name: string): Watchlist {
  const ts = nowIso();
  const row: Watchlist = {
    id: crypto.randomUUID(),
    user_id: userId,
    name: name.trim(),
    created_at: ts,
    updated_at: ts,
  };
  getStubState().watchlists.push(row);
  return row;
}

export function stubRenameWatchlist(userId: string, id: string, name: string): Watchlist | null {
  const row = getStubState().watchlists.find((item) => item.id === id && item.user_id === userId);
  if (!row) {
    return null;
  }
  row.name = name.trim();
  row.updated_at = nowIso();
  return row;
}

export function stubDeleteWatchlist(userId: string, id: string): boolean {
  const state = getStubState();
  const row = state.watchlists.find((item) => item.id === id && item.user_id === userId);
  if (!row) {
    return false;
  }
  state.watchlists = state.watchlists.filter((item) => item.id !== id);
  state.watchlistItems = state.watchlistItems.filter((item) => item.watchlist_id !== id);
  return true;
}

export function stubListWatchlistItems(userId: string, watchlistId: string): WatchlistItem[] {
  const owned = getStubState().watchlists.some(
    (row) => row.id === watchlistId && row.user_id === userId,
  );
  if (!owned) {
    return [];
  }
  return getStubState().watchlistItems.filter((row) => row.watchlist_id === watchlistId);
}

export function stubAddWatchlistItem(
  userId: string,
  watchlistId: string,
  instrumentId: string,
): WatchlistItem {
  const owned = getStubState().watchlists.some(
    (row) => row.id === watchlistId && row.user_id === userId,
  );
  if (!owned) {
    throw new Error("WATCHLIST_NOT_FOUND");
  }
  const exists = getStubState().watchlistItems.some(
    (row) => row.watchlist_id === watchlistId && row.instrument_id === instrumentId,
  );
  if (exists) {
    throw new Error("DUPLICATE_WATCHLIST_ITEM");
  }
  const siblings = getStubState().watchlistItems.filter((row) => row.watchlist_id === watchlistId);
  const row: WatchlistItem = {
    id: crypto.randomUUID(),
    watchlist_id: watchlistId,
    instrument_id: instrumentId,
    sort_order: siblings.length,
    created_at: nowIso(),
  };
  getStubState().watchlistItems.push(row);
  return row;
}

export function stubRemoveWatchlistItem(userId: string, itemId: string): boolean {
  const state = getStubState();
  const item = state.watchlistItems.find((row) => row.id === itemId);
  if (!item) {
    return false;
  }
  const owned = state.watchlists.some(
    (row) => row.id === item.watchlist_id && row.user_id === userId,
  );
  if (!owned) {
    return false;
  }
  state.watchlistItems = state.watchlistItems.filter((row) => row.id !== itemId);
  return true;
}

export function stubQuotesFor(instrumentIds: readonly string[]): QuotesLatest[] {
  return STUB_QUOTES.filter((row) => instrumentIds.includes(row.instrument_id));
}
