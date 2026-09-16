export type AuthGate = { action: "next" } | { action: "redirect"; pathname: string };

/**
 * Cookie `meridian_profile_ready` is a hint, not the source of truth.
 * Workspace/onboarding pages load the profile and redirect. Seeded demo users
 * already have display_name + experience_level, so a missing cookie must not
 * trap them on /onboarding or bounce them to /login.
 */
export function authRouteGate(input: {
  pathname: string;
  signedIn: boolean;
  profileReady: boolean;
}): AuthGate {
  const { pathname, signedIn, profileReady } = input;
  const isProtected =
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/admin");
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (isProtected && !signedIn) {
    return { action: "redirect", pathname: `/login?next=${encodeURIComponent(pathname)}` };
  }

  if (isAuthPage && signedIn) {
    return { action: "redirect", pathname: "/workspace" };
  }

  if (pathname.startsWith("/onboarding") && signedIn && profileReady) {
    return { action: "redirect", pathname: "/workspace" };
  }

  return { action: "next" };
}

/** After password login, do not honor a stale `next=/onboarding` from a prior bounce. */
export function postAuthDestination(wizardDest: string, nextHint: string): string {
  if (wizardDest === "/onboarding") {
    return "/onboarding";
  }
  if (!nextHint.startsWith("/") || nextHint.startsWith("//") || nextHint.includes("\\")) {
    return wizardDest;
  }
  if (nextHint === "/onboarding" || nextHint === "/login" || nextHint === "/signup") {
    return wizardDest;
  }
  return nextHint;
}
