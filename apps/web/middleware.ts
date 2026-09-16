import { NextResponse, type NextRequest } from "next/server";
import { authRouteGate } from "@/lib/auth/auth-gate";
import { isTraderAccessToken, readAccessTokenFromJar } from "@/lib/auth/insforge-cookies";
import { isAuthStub, PROFILE_READY_COOKIE, STUB_USER_COOKIE } from "@/lib/auth/mode";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });

  let signedIn = false;
  if (isAuthStub()) {
    signedIn = Boolean(request.cookies.get(STUB_USER_COOKIE)?.value);
  } else {
    const { updateSession } = await import("@insforge/sdk/ssr/middleware");
    const requestCookies = {
      get(name: string) {
        const value = request.cookies.get(name);
        if (name === "insforge_access_token" && value && !isTraderAccessToken(value.value)) {
          return undefined;
        }
        return value;
      },
      set: (...args: Parameters<typeof request.cookies.set>) => request.cookies.set(...args),
      delete: (...args: Parameters<typeof request.cookies.delete>) =>
        request.cookies.delete(...args),
    };
    await updateSession({
      requestCookies,
      responseCookies: response.cookies,
    });
    signedIn = Boolean(
      readAccessTokenFromJar(requestCookies) ?? readAccessTokenFromJar(response.cookies),
    );
  }

  const ready = request.cookies.get(PROFILE_READY_COOKIE)?.value === "1";
  const gate = authRouteGate({ pathname, signedIn, profileReady: ready });
  if (gate.action === "redirect") {
    return NextResponse.redirect(new URL(gate.pathname, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/workspace/:path*", "/admin/:path*", "/onboarding", "/login", "/signup"],
};
