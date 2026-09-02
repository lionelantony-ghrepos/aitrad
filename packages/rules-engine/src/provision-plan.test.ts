import { describe, expect, it } from "vitest";
import { authorize } from "./authorize";
import { paperAccountSeed } from "./paper-account-seed";
import {
  executeProvision,
  planProvision,
  ProvisionDeniedError,
  type ProvisionAccountRow,
  type ProvisionProfileRow,
} from "./provision-plan";

const USER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NOW = "2026-09-02T00:00:00.000Z";

function profile(overrides: Partial<ProvisionProfileRow> = {}): ProvisionProfileRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    user_id: USER,
    display_name: null,
    persona: null,
    experience_level: null,
    suitability_tier: null,
    objectives: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function account(overrides: Partial<ProvisionAccountRow> = {}): ProvisionAccountRow {
  const seed = paperAccountSeed();
  return {
    id: "22222222-2222-4222-8222-222222222222",
    user_id: USER,
    cash_balance: seed.cashBalance,
    currency: seed.currency,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

describe("planProvision", () => {
  it("creates profile + account from the seed table on a first visit", () => {
    const seed = paperAccountSeed();
    const plan = planProvision(USER, { profile: null, account: null });
    expect(plan.createProfile).toBe(true);
    expect(plan.createAccount).toBe(true);
    expect(plan.profileInsert.suitability_tier).toBeNull();
    expect(plan.accountInsert.cash_balance).toBe(seed.cashBalance);
    expect(plan.accountInsert.currency).toBe(seed.currency);
  });

  it("does not recreate or reset cash when rows already exist", () => {
    const existingAccount = account({ cash_balance: 12 });
    const plan = planProvision(USER, { profile: profile(), account: existingAccount });
    expect(plan.createProfile).toBe(false);
    expect(plan.createAccount).toBe(false);
    expect(plan.accountInsert.cash_balance).toBe(12);
  });
});

describe("executeProvision idempotency", () => {
  it("writes once and leaves a second call as a no-op", async () => {
    let storedProfile: ProvisionProfileRow | null = null;
    let storedAccount: ProvisionAccountRow | null = null;
    const audits: string[] = [];
    let profileInserts = 0;
    let accountInserts = 0;

    const ports = {
      userId: USER,
      authorize: (userId: string) => authorize({ userId, action: "provision-account" }),
      load: async () => ({ profile: storedProfile, account: storedAccount }),
      insertProfile: async () => {
        profileInserts += 1;
        storedProfile = profile();
        return storedProfile;
      },
      insertAccount: async () => {
        accountInserts += 1;
        storedAccount = account();
        return storedAccount;
      },
      writeAudit: async () => {
        audits.push("provision-account");
      },
    };

    const first = await executeProvision(ports);
    const second = await executeProvision(ports);

    expect(first.created).toEqual({ profile: true, account: true });
    expect(second.created).toEqual({ profile: false, account: false });
    expect(profileInserts).toBe(1);
    expect(accountInserts).toBe(1);
    expect(audits).toEqual(["provision-account"]);
    expect(second.account.cash_balance).toBe(paperAccountSeed().cashBalance);
  });

  it("repairs a missing account without inserting a second profile", async () => {
    let storedProfile: ProvisionProfileRow | null = profile();
    let storedAccount: ProvisionAccountRow | null = null;
    let profileInserts = 0;
    let accountInserts = 0;

    const result = await executeProvision({
      userId: USER,
      authorize: (userId: string) => authorize({ userId, action: "provision-account" }),
      load: async () => ({ profile: storedProfile, account: storedAccount }),
      insertProfile: async () => {
        profileInserts += 1;
        storedProfile = profile();
        return storedProfile;
      },
      insertAccount: async () => {
        accountInserts += 1;
        storedAccount = account();
        return storedAccount;
      },
      writeAudit: async () => undefined,
    });

    expect(result.created).toEqual({ profile: false, account: true });
    expect(profileInserts).toBe(0);
    expect(accountInserts).toBe(1);
  });

  it("denies an unauthenticated caller", async () => {
    await expect(
      executeProvision({
        userId: "",
        authorize: (userId: string) => authorize({ userId, action: "provision-account" }),
        load: async () => ({ profile: null, account: null }),
        insertProfile: async () => profile(),
        insertAccount: async () => account(),
        writeAudit: async () => undefined,
      }),
    ).rejects.toBeInstanceOf(ProvisionDeniedError);
  });
});
