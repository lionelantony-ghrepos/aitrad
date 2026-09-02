import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { isProfileWizardComplete } from "@meridian/rules-engine";
import { provisionAccountForUser } from "@/lib/api/provision";
import { writeProfileReady } from "@/lib/auth/cookies";
import { isAuthStub } from "@/lib/auth/mode";
import { readPublicInsforgeEnv } from "@/lib/insforge/env";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (isAuthStub()) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("insforge_code");
  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError || !code) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get("insforge_code_verifier")?.value;
  if (!codeVerifier) {
    return NextResponse.redirect(new URL("/login?error=missing_verifier", request.url));
  }

  const dest = new URL("/workspace", request.url);
  const response = NextResponse.redirect(dest);
  const env = readPublicInsforgeEnv();
  const { createAuthActions } = await import("@insforge/sdk/ssr");
  const auth = createAuthActions({
    baseUrl: env.baseUrl,
    anonKey: env.anonKey,
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });
  const { data, error } = await auth.exchangeOAuthCode(code, codeVerifier);
  if (error || !data?.user) {
    return NextResponse.redirect(new URL("/login?error=exchange_failed", request.url));
  }

  response.cookies.delete("insforge_code_verifier");
  const user = data.user as { id: string };
  const access = response.cookies.get("insforge_access_token")?.value;
  if (access) {
    const provisioned = await provisionAccountForUser({ userId: user.id, accessToken: access });
    writeProfileReady(response.cookies, isProfileWizardComplete(provisioned.profile));
    if (!isProfileWizardComplete(provisioned.profile)) {
      return NextResponse.redirect(new URL("/onboarding", request.url), {
        headers: response.headers,
      });
    }
  }
  return response;
}
