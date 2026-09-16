import { describe, expect, it } from "vitest";
import { authRouteGate, postAuthDestination } from "./auth-gate";

describe("authRouteGate", () => {
  it("sends anonymous users on /workspace to login", () => {
    expect(authRouteGate({ pathname: "/workspace", signedIn: false, profileReady: false })).toEqual(
      { action: "redirect", pathname: "/login?next=%2Fworkspace" },
    );
  });

  it("sends signed-in users on /login to workspace even without the ready cookie", () => {
    expect(authRouteGate({ pathname: "/login", signedIn: true, profileReady: false })).toEqual({
      action: "redirect",
      pathname: "/workspace",
    });
  });

  it("does not force /onboarding when the ready cookie is missing", () => {
    expect(authRouteGate({ pathname: "/workspace", signedIn: true, profileReady: false })).toEqual({
      action: "next",
    });
  });

  it("skips onboarding when the ready cookie is set", () => {
    expect(authRouteGate({ pathname: "/onboarding", signedIn: true, profileReady: true })).toEqual({
      action: "redirect",
      pathname: "/workspace",
    });
  });
});

describe("postAuthDestination", () => {
  it("ignores stale next=/onboarding once the wizard is complete", () => {
    expect(postAuthDestination("/workspace", "/onboarding")).toBe("/workspace");
    expect(postAuthDestination("/onboarding", "/workspace")).toBe("/onboarding");
    expect(postAuthDestination("/workspace", "/admin/rules")).toBe("/admin/rules");
  });
});
