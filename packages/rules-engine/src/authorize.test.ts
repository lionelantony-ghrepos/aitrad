import { describe, expect, it } from "vitest";
import {
  authorize,
  authorizeFromTable,
  decisionFromOutcome,
  entitlementHttpStatus,
} from "./authorize";
import { baselineTable } from "./baseline-tables";

const USER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TABLE = baselineTable("DT-ENT-01");

describe("authorize DT-ENT-01", () => {
  it("denies missing callers and empty actions", async () => {
    expect(await authorize({ userId: null, action: "trade:create" })).toMatchObject({
      allowed: false,
      reason: "UNAUTHENTICATED",
    });
    expect(
      await authorize({ userId: USER, action: "", table: TABLE, role: "trader" }),
    ).toMatchObject({
      allowed: false,
      reason: "ACTION_REQUIRED",
    });
    expect(await authorize({ userId: USER, action: "trade:create" })).toMatchObject({
      allowed: false,
      reason: "FORBIDDEN",
    });
  });

  it("denies unknown roles by default", () => {
    const result = authorizeFromTable({
      userId: USER,
      action: "trade:buy",
      role: "unknown",
      table: TABLE,
    });
    expect(result.allowed).toBe(false);
    expect(result.decision).toBe("deny");
    expect(entitlementHttpStatus(result)).toBe(403);
  });

  it("maps require_approval to not allowed", () => {
    expect(decisionFromOutcome({ decision: "require_approval" })).toBe("require_approval");
    expect(decisionFromOutcome({ decision: "allow" })).toBe("allow");
    expect(decisionFromOutcome({})).toBe("deny");
  });
});
