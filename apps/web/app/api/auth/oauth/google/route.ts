import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { isProfileWizardComplete } from "@meridian/rules-engine";
import { provisionAccountForUser } from "@/lib/api/provision";
import { writeProfileReady, writeStubSession } from "@/lib/auth/cookies";
import { isAuthStub } from "@/lib/auth/mode";
import { stubOauthUser } from "@/lib/auth/stub-store";
import { appOrigin, readPublicInsforgeEnv } from "@/lib/insforge/env";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (isAuthStub()) {
    const user = stubOauthUser(`e2e-google-${crypto.randomUUID()}@example.com`);
    const provisioned = await provisionAccountForUser({ userId: user.id, accessToken: user.id });
    const dest = isProfileWizardComplete(provisioned.profile) ? "/workspace" : "/onboarding";
    const response = NextResponse.redirect(new URL(dest, request.url));
    writeStubSession(response.cookies, user.id);
    writeProfileReady(response.cookies, isProfileWizardComplete(provisioned.profile));
    return response;
  }

  const env = readPublicInsforgeEnv();
  const { createAuthActions } = await import("@insforge/sdk/ssr");
  const cookieStore = await cookies();
  const auth = createAuthActions({
    baseUrl: env.baseUrl,
    anonKey: env.anonKey,
    cookies: cookieStore,
  });
  const { data, error } = await auth.signInWithOAuth("google", {
    redirectTo: new URL("/api/auth/callback", appOrigin()).toString(),
    skipBrowserRedirect: true,
  });
  if (error || !data?.url || !data.codeVerifier) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }
  cookieStore.set("insforge_code_verifier", data.codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return NextResponse.redirect(data.url);
}
