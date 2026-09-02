import { paperAccountSeed } from "./paper-account-seed";

export type ProvisionProfileRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  persona: string | null;
  experience_level: "novice" | "intermediate" | "advanced" | null;
  suitability_tier: "conservative" | "standard" | "full" | null;
  objectives: string | null;
  created_at: string;
  updated_at: string;
};

export type ProvisionAccountRow = {
  id: string;
  user_id: string;
  cash_balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type ExistingProvision = {
  profile: ProvisionProfileRow | null;
  account: ProvisionAccountRow | null;
};

export type ProvisionPlan = {
  createProfile: boolean;
  createAccount: boolean;
  profileInsert: {
    user_id: string;
    suitability_tier: null;
  };
  accountInsert: {
    user_id: string;
    cash_balance: number;
    currency: string;
  };
};

export function planProvision(userId: string, existing: ExistingProvision): ProvisionPlan {
  const seed = paperAccountSeed();
  return {
    createProfile: existing.profile === null,
    createAccount: existing.account === null,
    profileInsert: {
      user_id: userId,
      suitability_tier: null,
    },
    accountInsert: {
      user_id: userId,
      cash_balance: existing.account?.cash_balance ?? seed.cashBalance,
      currency: existing.account?.currency ?? seed.currency,
    },
  };
}

export type ProvisionPorts = {
  userId: string;
  authorize: (userId: string) => { allowed: boolean; reason?: string };
  load: () => Promise<ExistingProvision>;
  insertProfile: (row: ProvisionPlan["profileInsert"]) => Promise<ProvisionProfileRow>;
  insertAccount: (row: ProvisionPlan["accountInsert"]) => Promise<ProvisionAccountRow>;
  writeAudit: (entry: {
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    payload: Record<string, unknown>;
  }) => Promise<void>;
};

export class ProvisionDeniedError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(reason);
    this.name = "ProvisionDeniedError";
    this.reason = reason;
  }
}

export async function executeProvision(ports: ProvisionPorts): Promise<{
  profile: ProvisionProfileRow;
  account: ProvisionAccountRow;
  created: { profile: boolean; account: boolean };
}> {
  const decision = ports.authorize(ports.userId);
  if (!decision.allowed) {
    throw new ProvisionDeniedError(decision.reason ?? "DENIED");
  }

  const existing = await ports.load();
  const plan = planProvision(ports.userId, existing);

  let profile = existing.profile;
  let account = existing.account;

  if (plan.createProfile) {
    profile = await ports.insertProfile(plan.profileInsert);
  }
  if (plan.createAccount) {
    account = await ports.insertAccount(plan.accountInsert);
  }

  if (!profile || !account) {
    const reloaded = await ports.load();
    profile = profile ?? reloaded.profile;
    account = account ?? reloaded.account;
  }

  if (!profile || !account) {
    throw new Error("PROVISION_INCOMPLETE");
  }

  if (plan.createProfile || plan.createAccount) {
    await ports.writeAudit({
      user_id: ports.userId,
      action: "provision-account",
      entity_type: "account",
      entity_id: account.id,
      payload: {
        created: { profile: plan.createProfile, account: plan.createAccount },
      },
    });
  }

  return {
    profile,
    account,
    created: { profile: plan.createProfile, account: plan.createAccount },
  };
}
