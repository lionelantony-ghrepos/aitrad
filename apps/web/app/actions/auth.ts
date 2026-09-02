"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authorize, isProfileWizardComplete, profileWizardPatch } from "@meridian/rules-engine";
import { credentialsSchema, profileWizardSchema } from "@meridian/schemas";
import { createAuditLogRepository } from "@/lib/api/audit-log";
import { createRecordsClient } from "@/lib/api/client";
import { createProfilesRepository } from "@/lib/api/profiles";
import { provisionAccountForUser } from "@/lib/api/provision";
import { clearAuthCookies, writeProfileReady, writeStubSession } from "@/lib/auth/cookies";
import { E2E_STUB_HEADER, isAuthStub } from "@/lib/auth/mode";

async function stubEnabled(): Promise<boolean> {
  return isAuthStub((await headers()).get(E2E_STUB_HEADER));
}
import { safeInternalPath } from "@/lib/auth/safe-redirect";
import { getAccessToken, getSessionUser } from "@/lib/auth/session";
import { stubOauthUser, stubPatchProfile, stubSignIn, stubSignUp } from "@/lib/auth/stub-store";
import { readPublicInsforgeEnv } from "@/lib/insforge/env";
import { createInsForgeAuthActions } from "@/lib/insforge/server";

export type AuthActionResult = { ok: true } | { ok: false; message: string };

async function afterAuthenticated(userId: string, accessToken: string): Promise<string> {
  const provisioned = await provisionAccountForUser({ userId, accessToken });
  const ready = isProfileWizardComplete(provisioned.profile);
  writeProfileReady(await cookies(), ready);
  return ready ? "/workspace" : "/onboarding";
}

async function resolvePostAuthPath(
  userId: string,
  accessToken: string,
  nextHint: string,
): Promise<string> {
  const dest = await afterAuthenticated(userId, accessToken);
  if (dest === "/onboarding") {
    return dest;
  }
  return safeInternalPath(nextHint, dest);
}

export async function signUpAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Enter a valid email and password." };
  }

  if (await stubEnabled()) {
    let user;
    try {
      user = stubSignUp(parsed.data.email, parsed.data.password);
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_TAKEN") {
        return { ok: false, message: "That email is already registered." };
      }
      throw error;
    }
    writeStubSession(await cookies(), user.id);
    redirect(await afterAuthenticated(user.id, user.id));
  }

  const auth = await createInsForgeAuthActions();
  const { data, error } = await auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data?.user) {
    return { ok: false, message: error?.message ?? "Sign up failed." };
  }
  if ("requireEmailVerification" in data && data.requireEmailVerification) {
    return { ok: false, message: "Check your email to verify the account, then sign in." };
  }
  const token = await getAccessToken();
  const user = data.user as { id: string };
  if (!token) {
    return { ok: false, message: "Session was not established." };
  }
  redirect(await afterAuthenticated(user.id, token));
}

export async function signInAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Enter a valid email and password." };
  }

  const nextHint = String(formData.get("next") ?? "");

  if (await stubEnabled()) {
    let user;
    try {
      user = stubSignIn(parsed.data.email, parsed.data.password);
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
        return { ok: false, message: "Invalid email or password." };
      }
      throw error;
    }
    writeStubSession(await cookies(), user.id);
    redirect(await resolvePostAuthPath(user.id, user.id, nextHint));
  }

  const auth = await createInsForgeAuthActions();
  const { data, error } = await auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data?.user) {
    return { ok: false, message: error?.message ?? "Sign in failed." };
  }
  const token = await getAccessToken();
  const user = data.user as { id: string };
  if (!token) {
    return { ok: false, message: "Session was not established." };
  }
  redirect(await resolvePostAuthPath(user.id, token, nextHint));
}

export async function startGoogleOAuthAction(): Promise<void> {
  if (await stubEnabled()) {
    const user = stubOauthUser(`e2e-google-${crypto.randomUUID()}@example.com`);
    writeStubSession(await cookies(), user.id);
    redirect(await afterAuthenticated(user.id, user.id));
  }
  redirect("/api/auth/oauth/google");
}

export async function signOutAction(): Promise<void> {
  const jar = await cookies();
  if (!(await stubEnabled())) {
    const auth = await createInsForgeAuthActions();
    await auth.signOut();
  }
  clearAuthCookies(jar);
  redirect("/login");
}

export async function completeWizardAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = profileWizardSchema.safeParse({
    display_name: formData.get("display_name"),
    experience_level: formData.get("experience_level"),
    objectives: formData.get("objectives") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: "Display name and experience level are required." };
  }

  const user = await getSessionUser();
  const token = await getAccessToken();
  const gate = authorize({ userId: user?.id, action: "profile-wizard" });
  if (!user || !token || !gate.allowed) {
    return { ok: false, message: "You must be signed in." };
  }

  const patch = profileWizardPatch(parsed.data);

  if (await stubEnabled()) {
    stubPatchProfile(user.id, patch);
    writeProfileReady(await cookies(), true);
    redirect("/workspace");
  }

  const env = readPublicInsforgeEnv();
  const records = createRecordsClient({
    baseUrl: env.baseUrl,
    getAccessToken: () => token,
  });
  const profiles = createProfilesRepository(records);
  const rows = await profiles.listMine();
  const mine = rows[0];
  if (!mine) {
    return { ok: false, message: "Profile is not provisioned." };
  }
  await profiles.updateById(mine.id, patch);
  await createAuditLogRepository(records).insert({
    user_id: user.id,
    action: "profile-wizard",
    entity_type: "profile",
    entity_id: mine.id,
    payload: { experience_level: patch.experience_level },
  });
  writeProfileReady(await cookies(), true);
  redirect("/workspace");
}
