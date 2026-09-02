import { NextResponse, type NextRequest } from "next/server";
import { isAuthStub, PROFILE_READY_COOKIE, STUB_USER_COOKIE } from "@/lib/auth/mode";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith("/workspace") || pathname.startsWith("/onboarding");
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const response = NextResponse.next({ request });

  let signedIn = false;
  if (isAuthStub()) {
    signedIn = Boolean(request.cookies.get(STUB_USER_COOKIE)?.value);
  } else {
    const { updateSession } = await import("@insforge/sdk/ssr/middleware");
    await updateSession({
      requestCookies: request.cookies,
      responseCookies: response.cookies,
    });
    signedIn = Boolean(
      request.cookies.get("insforge_access_token")?.value ??
      response.cookies.get("insforge_access_token")?.value,
    );
  }

  const ready = request.cookies.get(PROFILE_READY_COOKIE)?.value === "1";

  if (isProtected && !signedIn) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (isAuthPage && signedIn) {
    return NextResponse.redirect(new URL(ready ? "/workspace" : "/onboarding", request.url));
  }

  if (pathname.startsWith("/workspace") && signedIn && !ready) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (pathname.startsWith("/onboarding") && signedIn && ready) {
    return NextResponse.redirect(new URL("/workspace", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/workspace/:path*", "/onboarding", "/login", "/signup"],
};
