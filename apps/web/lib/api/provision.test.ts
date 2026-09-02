import { beforeEach, describe, expect, it } from "vitest";
import { paperAccountSeed } from "@meridian/rules-engine";
import { resetStubState, stubSignUp } from "../auth/stub-store";
import { provisionAccountForUser } from "./provision";

describe("provisionAccountForUser stub", () => {
  beforeEach(() => {
    process.env.E2E_AUTH_STUB = "1";
    resetStubState();
  });

  it("is idempotent for the same user", async () => {
    const user = stubSignUp("prov@example.com", "secret");
    const first = await provisionAccountForUser({ userId: user.id, accessToken: user.id });
    const second = await provisionAccountForUser({ userId: user.id, accessToken: user.id });
    expect(first.created).toEqual({ profile: true, account: true });
    expect(second.created).toEqual({ profile: false, account: false });
    expect(first.account.id).toBe(second.account.id);
    expect(second.account.cash_balance).toBe(paperAccountSeed().cashBalance);
  });
});
