import { cache } from "react";
import { cookies } from "next/headers";
import { isProfileWizardComplete } from "@meridian/rules-engine";
import type { Account, SessionUser } from "@meridian/schemas";
import { tryReadPublicInsforgeEnv } from "../insforge/env";
import { createInsForgeServerClient } from "../insforge/server";
import { readAccessTokenFromJar } from "./insforge-cookies";
import { isAuthStub, STUB_USER_COOKIE } from "./mode";
import { sessionUserFromAccessToken } from "./session-user";
import { stubGetRole, stubGetUser, stubLoadProvision } from "./stub-store";

export type AuthContext = {
  user: SessionUser;
  accessToken: string;
  account: Account | null;
  wizardComplete: boolean;
  role: string;
};

export async function getAccessToken(): Promise<string | null> {
  const jar = await cookies();
  if (isAuthStub()) {
    return jar.get(STUB_USER_COOKIE)?.value ?? null;
  }
  return readAccessTokenFromJar(jar);
}

export const getSessionUser = cache(async function getSessionUser(): Promise<SessionUser | null> {
  if (isAuthStub()) {
    const jar = await cookies();
    const userId = jar.get(STUB_USER_COOKIE)?.value;
    if (!userId) {
      return null;
    }
    const user = stubGetUser(userId);
    return user ? { id: user.id, email: user.email } : null;
  }

  const env = tryReadPublicInsforgeEnv();
  const accessToken = await getAccessToken();
  if (!env || !accessToken) {
    return null;
  }

  const fromToken = sessionUserFromAccessToken(accessToken);
  if (fromToken) {
    return fromToken;
  }

  const client = await createInsForgeServerClient();
  const { data } = await client.auth.getCurrentUser();
  const raw = data?.user as { id?: string; email?: string } | undefined;
  if (!raw?.id || !raw.email) {
    return null;
  }
  return { id: raw.id, email: raw.email };
});

export async function loadAuthContext(): Promise<AuthContext | null> {
  if (isAuthStub()) {
    const user = await getSessionUser();
    const accessToken = await getAccessToken();
    if (!user || !accessToken) {
      return null;
    }
    const loaded = stubLoadProvision(user.id);
    return {
      user,
      accessToken,
      account: loaded.account,
      wizardComplete: isProfileWizardComplete(loaded.profile),
      role: stubGetRole(user.id),
    };
  }

  const env = tryReadPublicInsforgeEnv();
  const accessToken = await getAccessToken();
  if (!env || !accessToken) {
    return null;
  }

  const user = await getSessionUser();
  if (!user) {
    return null;
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
  const { data: roles } = await client.database
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const profile = Array.isArray(profiles) ? (profiles[0] ?? null) : null;
  const account = Array.isArray(accounts) ? (accounts[0] ?? null) : null;
  const roleRow = Array.isArray(roles) ? (roles[0] as { role?: string } | undefined) : undefined;
  return {
    user,
    accessToken,
    account: account as Account | null,
    wizardComplete: isProfileWizardComplete(
      profile as { display_name: string | null; experience_level: string | null } | null,
    ),
    role: roleRow?.role ?? "trader",
  };
}
