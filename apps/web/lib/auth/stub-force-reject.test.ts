import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { afterEach, describe, expect, it } from "vitest";
import { resetStubState, stubArmForceOrderReject, stubConsumeForceOrderReject } from "./stub-store";

const forceRejectRoute = readFileSync(
  path.join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../app/api/e2e/force-order-reject/route.ts",
  ),
  "utf8",
);

describe("stub force order reject (E2E_AUTH_STUB Path A)", () => {
  afterEach(() => {
    resetStubState();
  });

  it("arms and consumes once per user", () => {
    stubArmForceOrderReject("user-1");
    expect(stubConsumeForceOrderReject("user-1")).toBe(true);
    expect(stubConsumeForceOrderReject("user-1")).toBe(false);
  });

  it("is gated on isAuthStub and does not use a service role key", () => {
    expect(forceRejectRoute).toContain("isAuthStub");
    expect(forceRejectRoute).not.toContain("INSFORGE_API_KEY");
    expect(forceRejectRoute).not.toContain("API_KEY");
  });
});
