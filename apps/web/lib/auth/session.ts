import { cookies, headers } from "next/headers";
import { DEFAULT_ACCESS_TOKEN_COOKIE } from "@insforge/sdk/ssr";
import { isProfileWizardComplete } from "@meridian/rules-engine";
import type { Account, SessionUser } from "@meridian/schemas";
import { E2E_STUB_HEADER, isAuthStub, STUB_USER_COOKIE } from "./mode";

async function stubEnabled(): Promise<boolean> {
  return isAuthStub((await headers()).get(E2E_STUB_HEADER));
}
import { stubGetUser, stubLoadProvision } from "./stub-store";
import { createInsForgeServerClient } from "../insforge/server";

export type AuthContext = {
  user: SessionUser;
  accessToken: string;
  account: Account | null;
  wizardComplete: boolean;
};

export async function getAccessToken(): Promise<string | null> {
  const jar = await cookies();
  if (await stubEnabled()) {
    return jar.get(STUB_USER_COOKIE)?.value ?? null;
  }
  return jar.get(DEFAULT_ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (await stubEnabled()) {
    const jar = await cookies();
    const userId = jar.get(STUB_USER_COOKIE)?.value;
    if (!userId) {
      return null;
    }
    const user = stubGetUser(userId);
    return user ? { id: user.id, email: user.email } : null;
  }

  const client = await createInsForgeServerClient();
  const { data } = await client.auth.getCurrentUser();
  const raw = data?.user as { id?: string; email?: string } | undefined;
  if (!raw?.id || !raw.email) {
    return null;
  }
  return { id: raw.id, email: raw.email };
}

export async function loadAuthContext(): Promise<AuthContext | null> {
  const user = await getSessionUser();
  const accessToken = await getAccessToken();
  if (!user || !accessToken) {
    return null;
  }

  if (await stubEnabled()) {
    const loaded = stubLoadProvision(user.id);
    return {
      user,
      accessToken,
      account: loaded.account,
      wizardComplete: isProfileWizardComplete(loaded.profile),
    };
  }

  const client = await createInsForgeServerClient();
  const { data: profiles } = await client.database
    .from("profiles")
    .select("*")
    .eq("user_id", user.id);
  const { data: accounts } = await client.database
    .from("accounts")
    .select("*")
    .eq("user_id", user.id);
  const profile = Array.isArray(profiles) ? (profiles[0] ?? null) : null;
  const account = Array.isArray(accounts) ? (accounts[0] ?? null) : null;
  return {
    user,
    accessToken,
    account: account as Account | null,
    wizardComplete: isProfileWizardComplete(
      profile as { display_name: string | null; experience_level: string | null } | null,
    ),
  };
}
