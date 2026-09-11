import {
  createRulesAdminMemory,
  paperAccountSeed,
  type RulesAdminMemory,
} from "@meridian/rules-engine";
import { tryReserveBuyingPower, releaseBuyingPower } from "@meridian/paper-engine";
import { hashEmbed, hybridRank, newsEmbedText, ragFixtureItems } from "@meridian/rag";
import { evaluateScreener } from "@meridian/schemas";
import type {
  Account,
  AdminUserRow,
  Instrument,
  MarketBar,
  Profile,
  ExecutionRecord,
  OrderRecord,
  PositionRecord,
  PortfolioSnapshot,
  QuotesLatest,
  NewsItem,
  FundamentalsMetrics,
  FundamentalsRecord,
  DesProfile,
  RuleAuditView,
  Watchlist,
  WatchlistItem,
  ScreenRecord,
  ScreenerCriteria,
  ScreenerFact,
  ScreenerRunRequest,
  ScreenerRunResponse,
  NewsSearchHit,
  NewsSearchRequest,
  UserRole,
  AlertRule,
  AlertInstance,
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
  screens: ScreenRecord[];
  alertRules: AlertRule[];
  alerts: AlertInstance[];
  orders: OrderRecord[];
  executions: ExecutionRecord[];
  positions: PositionRecord[];
  snapshots: PortfolioSnapshot[];
  rules: RulesAdminMemory;
  roles: Map<string, UserRole>;
  /** Next stub create for these users fails reserve so the ticket can show a rejected order. */
  forceOrderRejectUserIds: Set<string>;
};

function createState(): StubState {
  return {
    usersByEmail: new Map(),
    usersById: new Map(),
    profiles: new Map(),
    accounts: new Map(),
    watchlists: [],
    watchlistItems: [],
    screens: [],
    alertRules: [],
    alerts: [],
    orders: [],
    executions: [],
    positions: [],
    snapshots: [],
    rules: createRulesAdminMemory(),
    roles: new Map(),
    forceOrderRejectUserIds: new Set(),
  };
}

export function stubRulesMemory(): RulesAdminMemory {
  return getStubState().rules;
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

export function stubArmForceOrderReject(userId: string): void {
  getStubState().forceOrderRejectUserIds.add(userId);
}

/** Returns true once, then clears, so a retry can succeed. */
export function stubConsumeForceOrderReject(userId: string): boolean {
  const ids = getStubState().forceOrderRejectUserIds;
  if (!ids.has(userId)) {
    return false;
  }
  ids.delete(userId);
  return true;
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
  state.roles.set(user.id, "trader");
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
  state.roles.set(user.id, "trader");
  return user;
}

export function stubGetUser(userId: string): StubUser | null {
  return getStubState().usersById.get(userId) ?? null;
}

export function stubGetRole(userId: string): UserRole {
  return getStubState().roles.get(userId) ?? "trader";
}

export function stubSetRole(userId: string, role: UserRole): void {
  getStubState().roles.set(userId, role);
}

export function stubListUsers(): AdminUserRow[] {
  const state = getStubState();
  return [...state.usersById.values()].map((user) => ({
    user_id: user.id,
    email: user.email,
    display_name: state.profiles.get(user.id)?.display_name ?? null,
    role: state.roles.get(user.id) ?? "trader",
  }));
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
    reserved_cash: 0,
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
  if (next.persona === "trader" || next.persona === "admin" || next.persona === "compliance") {
    getStubState().roles.set(userId, next.persona);
  }
  return next;
}

export function stubAccountCount(userId: string): number {
  return getStubState().accounts.has(userId) ? 1 : 0;
}

export const STUB_AAPL_INSTRUMENT_ID = "11111111-1111-4111-8111-111111111111";
export const STUB_MSFT_INSTRUMENT_ID = "22222222-2222-4222-8222-222222222222";
export const STUB_NVDA_INSTRUMENT_ID = "33333333-3333-4333-8333-333333333333";
export const STUB_TSLA_INSTRUMENT_ID = "44444444-4444-4444-8444-444444444444";

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
    market_cap_band: "mega",
    created_at: STUB_TS,
    updated_at: STUB_TS,
  };
}

function stubMetrics(partial: {
  pe: number;
  eps: number;
  revenue: number;
  growth: number;
  gross: number;
  net: number;
  yield: number;
  shares: number;
  mcap: number;
  low: number;
  high: number;
  buy: number;
  hold: number;
  sell: number;
}): FundamentalsMetrics {
  return {
    valuation: { pe: partial.pe, shares_out_m: partial.shares, market_cap_b: partial.mcap },
    income: {
      eps_ttm: partial.eps,
      revenue_b: partial.revenue,
      revenue_growth_pct: partial.growth,
      next_earnings: "2026-08-26",
      revenue_periods: {
        labels: ["FY23", "FY24", "FY25", "TTM"],
        values: [
          Math.round(partial.revenue * 0.82 * 10) / 10,
          Math.round(partial.revenue * 0.9 * 10) / 10,
          Math.round(partial.revenue * 0.97 * 10) / 10,
          partial.revenue,
        ],
      },
      eps_periods: {
        labels: ["FY23", "FY24", "FY25", "TTM"],
        values: [
          Math.round(partial.eps * 0.7 * 100) / 100,
          Math.round(partial.eps * 0.82 * 100) / 100,
          Math.round(partial.eps * 0.93 * 100) / 100,
          partial.eps,
        ],
      },
    },
    margins: { gross_margin_pct: partial.gross, net_margin_pct: partial.net },
    dividends: { dividend_yield: partial.yield },
    ranges: { week52_low: partial.low, week52_high: partial.high },
    analyst: { buy: partial.buy, hold: partial.hold, sell: partial.sell },
  };
}

export const STUB_INSTRUMENTS: Instrument[] = [
  marketInstrument(STUB_AAPL_INSTRUMENT_ID, "AAPL", "Apple Inc."),
  marketInstrument(STUB_MSFT_INSTRUMENT_ID, "MSFT", "Microsoft Corporation"),
  marketInstrument(STUB_NVDA_INSTRUMENT_ID, "NVDA", "NVIDIA Corporation"),
  marketInstrument(STUB_TSLA_INSTRUMENT_ID, "TSLA", "Tesla, Inc."),
];

export const STUB_FUNDAMENTALS: FundamentalsRecord[] = [
  {
    instrument_id: STUB_AAPL_INSTRUMENT_ID,
    updated_at: STUB_TS,
    metrics: stubMetrics({
      pe: 44.9,
      eps: 4.72,
      revenue: 260.7,
      growth: 12.5,
      gross: 51.1,
      net: 6,
      yield: 1.37,
      shares: 4789,
      mcap: 3200,
      low: 131.24,
      high: 243.61,
      buy: 7,
      hold: 13,
      sell: 5,
    }),
  },
  {
    instrument_id: STUB_MSFT_INSTRUMENT_ID,
    updated_at: STUB_TS,
    metrics: stubMetrics({
      pe: 23.6,
      eps: 19.83,
      revenue: 14.5,
      growth: 8.2,
      gross: 50.8,
      net: 11.2,
      yield: 2.28,
      shares: 3986,
      mcap: 2800,
      low: 333.11,
      high: 643.74,
      buy: 23,
      hold: 11,
      sell: 3,
    }),
  },
  {
    instrument_id: STUB_NVDA_INSTRUMENT_ID,
    updated_at: STUB_TS,
    metrics: stubMetrics({
      pe: 32.9,
      eps: 4.8,
      revenue: 164,
      growth: -1.2,
      gross: 59.5,
      net: 13.7,
      yield: 0,
      shares: 623,
      mcap: 2500,
      low: 117.87,
      high: 211.84,
      buy: 6,
      hold: 8,
      sell: 5,
    }),
  },
  {
    instrument_id: STUB_TSLA_INSTRUMENT_ID,
    updated_at: STUB_TS,
    metrics: stubMetrics({
      pe: 40,
      eps: 2.1,
      revenue: 90,
      growth: 5,
      gross: 18,
      net: 8,
      yield: 0,
      shares: 3100,
      mcap: 800,
      low: 180,
      high: 280,
      buy: 10,
      hold: 9,
      sell: 6,
    }),
  },
];

export const STUB_RSI: Record<string, number> = {
  [STUB_AAPL_INSTRUMENT_ID]: 55,
  [STUB_MSFT_INSTRUMENT_ID]: 42,
  [STUB_NVDA_INSTRUMENT_ID]: 72,
  [STUB_TSLA_INSTRUMENT_ID]: 28,
};

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
  {
    instrument_id: STUB_NVDA_INSTRUMENT_ID,
    bid: 119.8,
    ask: 120.1,
    last: 120,
    prev_close: 118,
    volume: 900_000,
    ts: STUB_TS,
  },
  {
    instrument_id: STUB_TSLA_INSTRUMENT_ID,
    bid: 249.5,
    ask: 249.8,
    last: 249.6,
    prev_close: 245,
    volume: 700_000,
    ts: STUB_TS,
  },
];

const STUB_NEWS_TS = "2026-09-09T15:00:00.000Z";

export const STUB_NEWS: NewsItem[] = [
  ...ragFixtureItems(),
  {
    id: "55555555-5555-4555-8555-555555555551",
    ts: "2026-09-09T16:00:00.000Z",
    headline: "Tesla beats Q2 estimates as AI revenue jumps 12%",
    body: "Management highlighted cloud as the primary swing factor. Street models now imply a 12% revision path into the next print.",
    source: "Reuters",
    symbols: ["TSLA"],
    sector: "Consumer Discretionary",
    sentiment: 0.62,
    event_type: "earnings",
  },
  {
    id: "55555555-5555-4555-8555-555555555552",
    ts: "2026-09-09T15:30:00.000Z",
    headline: "Morgan Stanley upgrades Tesla to Buy, lifts target to $280",
    body: "The note cites execution as the key debate versus consensus. Positioning in Consumer Discretionary names may shift after the call.",
    source: "Bloomberg",
    symbols: ["TSLA"],
    sector: "Consumer Discretionary",
    sentiment: 0.41,
    event_type: "analyst",
  },
  {
    id: "55555555-5555-4555-8555-555555555553",
    ts: "2026-09-09T15:10:00.000Z",
    headline: "Apple unveils next-gen AI platform, targeting the enterprise AI market",
    body: "Early demand checks in enterprise AI will set the near-term narrative. Rivals in Technology are watching execution on next-gen AI platform.",
    source: "WSJ",
    symbols: ["AAPL"],
    sector: "Technology",
    sentiment: 0.35,
    event_type: "product",
  },
  {
    id: "55555555-5555-4555-8555-555555555554",
    ts: STUB_NEWS_TS,
    headline: "Fed signals a data-dependent path; Technology stocks climb",
    body: "Rates traders marked the a data-dependent path into the next session. Technology factor baskets climb as yields ease.",
    source: "CNBC",
    symbols: ["AAPL", "MSFT"],
    sector: "Technology",
    sentiment: 0.12,
    event_type: "macro",
  },
];

export function stubListNews(): NewsItem[] {
  return [...STUB_NEWS].sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
}

export function stubSearchNews(request: NewsSearchRequest): NewsSearchHit[] {
  const corpus = STUB_NEWS.map((item) => ({
    item,
    vector: hashEmbed(newsEmbedText(item)),
  }));
  return hybridRank({
    queryVector: hashEmbed(request.query),
    corpus,
    symbols: request.symbols,
    since: request.since,
    limit: request.limit,
  });
}

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

export function stubInsertOrder(row: OrderRecord): OrderRecord {
  getStubState().orders.push(row);
  return row;
}

export function stubTryReserve(userId: string, amount: number): boolean {
  const account = getStubState().accounts.get(userId);
  if (!account) {
    return false;
  }
  const result = tryReserveBuyingPower(
    { cashBalance: account.cash_balance, reservedCash: account.reserved_cash ?? 0 },
    amount,
  );
  if (!result.ok) {
    return false;
  }
  account.reserved_cash = result.ledger.reservedCash;
  return true;
}

export function stubReleaseReserve(userId: string, amount: number): void {
  const account = getStubState().accounts.get(userId);
  if (!account) {
    return;
  }
  const next = releaseBuyingPower(
    { cashBalance: account.cash_balance, reservedCash: account.reserved_cash ?? 0 },
    amount,
  );
  account.reserved_cash = next.reservedCash;
}

export function stubGetOrder(userId: string, orderId: string): OrderRecord | null {
  return getStubState().orders.find((row) => row.id === orderId && row.user_id === userId) ?? null;
}

export function stubReplaceOrder(row: OrderRecord): void {
  const state = getStubState();
  const idx = state.orders.findIndex((item) => item.id === row.id);
  if (idx >= 0) {
    state.orders[idx] = row;
  }
}

export function stubListOrders(userId: string): OrderRecord[] {
  return getStubState()
    .orders.filter((row) => row.user_id === userId)
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function stubInsertExecution(row: ExecutionRecord): ExecutionRecord {
  getStubState().executions.push(row);
  return row;
}

export function stubListPositions(userId: string): PositionRecord[] {
  return getStubState()
    .positions.filter((row) => row.user_id === userId)
    .slice()
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export function stubUpsertPosition(row: PositionRecord): PositionRecord {
  const state = getStubState();
  const idx = state.positions.findIndex(
    (item) => item.account_id === row.account_id && item.instrument_id === row.instrument_id,
  );
  if (idx >= 0) {
    state.positions[idx] = row;
    return row;
  }
  state.positions.push(row);
  return row;
}

export function stubListSnapshots(userId: string): PortfolioSnapshot[] {
  return getStubState()
    .snapshots.filter((row) => row.user_id === userId)
    .slice()
    .sort((a, b) => a.as_of_date.localeCompare(b.as_of_date));
}

export function stubInsertSnapshot(row: PortfolioSnapshot): PortfolioSnapshot {
  getStubState().snapshots.push(row);
  return row;
}

export function stubListExecutions(userId: string, orderId?: string): ExecutionRecord[] {
  return getStubState()
    .executions.filter(
      (row) => row.user_id === userId && (orderId ? row.order_id === orderId : true),
    )
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function stubGetRuleAudit(id: string): RuleAuditView | null {
  return getStubState().rules.audits.find((row) => row.id === id) ?? null;
}

export function stubInstrumentBySymbol(symbol: string): Instrument | null {
  const key = symbol.trim().toUpperCase();
  return STUB_INSTRUMENTS.find((row) => row.symbol === key) ?? null;
}

export function stubGetDesProfile(symbol: string): DesProfile | null {
  const instrument = stubInstrumentBySymbol(symbol);
  if (!instrument) {
    return null;
  }
  const fundamentals = STUB_FUNDAMENTALS.find((row) => row.instrument_id === instrument.id);
  if (!fundamentals) {
    return null;
  }
  const quote = STUB_QUOTES.find((row) => row.instrument_id === instrument.id) ?? null;
  const peers = STUB_INSTRUMENTS.filter(
    (row) => row.industry === instrument.industry && row.symbol !== instrument.symbol,
  )
    .map((row) => {
      const cap =
        STUB_FUNDAMENTALS.find((item) => item.instrument_id === row.id)?.metrics.valuation
          .market_cap_b ?? 0;
      return { row, cap };
    })
    .sort((a, b) => b.cap - a.cap)
    .slice(0, 6)
    .map(({ row, cap }) => ({
      symbol: row.symbol,
      name: row.name,
      instrument_id: row.id,
      last: STUB_QUOTES.find((item) => item.instrument_id === row.id)?.last ?? null,
      market_cap_b: cap,
    }));
  return { instrument, quote, fundamentals, peers };
}

export function stubScreenerFacts(): ScreenerFact[] {
  return STUB_INSTRUMENTS.map((instrument) => {
    const quote = STUB_QUOTES.find((row) => row.instrument_id === instrument.id);
    const fundamentals = STUB_FUNDAMENTALS.find((row) => row.instrument_id === instrument.id);
    return {
      instrument_id: instrument.id,
      symbol: instrument.symbol,
      name: instrument.name,
      sector: instrument.sector,
      market_cap_band: instrument.market_cap_band ?? null,
      pe: fundamentals?.metrics.valuation.pe ?? null,
      dividend_yield: fundamentals?.metrics.dividends.dividend_yield ?? null,
      last: quote?.last ?? null,
      prev_close: quote?.prev_close ?? null,
      volume: quote?.volume ?? null,
      rsi_14: STUB_RSI[instrument.id] ?? null,
      week52_low: fundamentals?.metrics.ranges.week52_low ?? null,
      week52_high: fundamentals?.metrics.ranges.week52_high ?? null,
    };
  });
}

export function stubRunScreener(request: ScreenerRunRequest): ScreenerRunResponse {
  return evaluateScreener(stubScreenerFacts(), { ...request, op: "run" });
}

export function stubListScreens(userId: string): ScreenRecord[] {
  return getStubState().screens.filter((row) => row.user_id === userId);
}

export function stubSaveScreen(
  userId: string,
  name: string,
  criteria: ScreenerCriteria,
  id?: string,
): ScreenRecord {
  const state = getStubState();
  const ts = nowIso();
  if (id) {
    const existing = state.screens.find((row) => row.id === id && row.user_id === userId);
    if (!existing) {
      throw new Error("SCREEN_NOT_FOUND");
    }
    existing.name = name;
    existing.criteria = criteria;
    existing.updated_at = ts;
    return existing;
  }
  const row: ScreenRecord = {
    id: crypto.randomUUID(),
    user_id: userId,
    name,
    criteria,
    created_at: ts,
    updated_at: ts,
  };
  state.screens.push(row);
  return row;
}

export function stubDeleteScreen(userId: string, id: string): boolean {
  const state = getStubState();
  const index = state.screens.findIndex((row) => row.id === id && row.user_id === userId);
  if (index < 0) {
    return false;
  }
  state.screens.splice(index, 1);
  return true;
}

export function stubMarketBars(
  instrumentId: string,
  timeframe: "1m" | "1d",
  tsGte: string,
  now: Date = new Date(),
): MarketBar[] {
  const instrument = STUB_INSTRUMENTS.find((row) => row.id === instrumentId);
  if (!instrument) {
    return [];
  }
  const quote = STUB_QUOTES.find((row) => row.instrument_id === instrumentId);
  const last = quote?.last ?? 100;
  const cutoff = Date.parse(tsGte);
  const nowMs = now.getTime();
  const bars: MarketBar[] = [];
  if (timeframe === "1d") {
    for (let i = 40; i >= 0; i -= 1) {
      const ts = new Date(nowMs - i * 24 * 60 * 60 * 1000).toISOString();
      if (Date.parse(ts) < cutoff) {
        continue;
      }
      const c = last - i * 0.25;
      bars.push({
        instrument_id: instrumentId,
        timeframe: "1d",
        ts,
        o: c - 0.4,
        h: c + 0.6,
        l: c - 0.8,
        c,
        v: 1_000_000 + i,
      });
    }
    return bars;
  }
  for (let i = 80; i >= 0; i -= 1) {
    const ts = new Date(nowMs - i * 60 * 1000).toISOString();
    if (Date.parse(ts) < cutoff) {
      continue;
    }
    const c = last - i * 0.02;
    bars.push({
      instrument_id: instrumentId,
      timeframe: "1m",
      ts,
      o: c - 0.05,
      h: c + 0.08,
      l: c - 0.1,
      c,
      v: 1_000 + i,
    });
  }
  return bars;
}

export function stubListAlertRules(userId: string): AlertRule[] {
  return getStubState().alertRules.filter((row) => row.user_id === userId);
}

export function stubListAlerts(userId: string): AlertInstance[] {
  return getStubState()
    .alerts.filter((row) => row.user_id === userId)
    .slice()
    .sort((a, b) => b.fired_at.localeCompare(a.fired_at));
}

export function stubCreateAlertRule(row: AlertRule): AlertRule {
  getStubState().alertRules.push(row);
  return row;
}

export function stubPatchAlertRule(
  userId: string,
  id: string,
  patch: Partial<Pick<AlertRule, "active" | "name" | "throttle_state">>,
): AlertRule | null {
  const row = getStubState().alertRules.find((item) => item.id === id && item.user_id === userId);
  if (!row) {
    return null;
  }
  if (patch.active !== undefined) {
    row.active = patch.active;
  }
  if (patch.name !== undefined) {
    row.name = patch.name;
  }
  if (patch.throttle_state !== undefined) {
    row.throttle_state = patch.throttle_state;
  }
  row.updated_at = nowIso();
  return row;
}

export function stubDeleteAlertRule(userId: string, id: string): boolean {
  const state = getStubState();
  const before = state.alertRules.length;
  state.alertRules = state.alertRules.filter((row) => !(row.id === id && row.user_id === userId));
  state.alerts = state.alerts.filter((row) => row.alert_rule_id !== id || row.user_id !== userId);
  return state.alertRules.length !== before;
}

export function stubInsertAlert(row: AlertInstance): AlertInstance {
  getStubState().alerts.push(row);
  return row;
}

export function stubMarkAlertRead(userId: string, id: string, read: boolean): AlertInstance | null {
  const row = getStubState().alerts.find((item) => item.id === id && item.user_id === userId);
  if (!row) {
    return null;
  }
  row.read = read;
  return row;
}

export function stubQuoteForInstrument(instrumentId: string): QuotesLatest | undefined {
  return STUB_QUOTES.find((row) => row.instrument_id === instrumentId);
}
