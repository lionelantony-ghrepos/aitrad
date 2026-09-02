import { paperAccountSeed } from "@meridian/rules-engine";
import type { Account, Profile } from "@meridian/schemas";

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
};

function createState(): StubState {
  return {
    usersByEmail: new Map(),
    usersById: new Map(),
    profiles: new Map(),
    accounts: new Map(),
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
