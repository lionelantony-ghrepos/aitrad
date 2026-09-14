import { describe, expect, it } from "vitest";
import {
  auditAdminRequestSchema,
  auditAdminListResponseSchema,
  auditChainVerifyResultSchema,
} from "./audit-admin";

describe("audit-admin DTOs", () => {
  it("parses list/verify/setRetention ops", () => {
    expect(auditAdminRequestSchema.parse({ op: "list" }).op).toBe("list");
    expect(
      auditAdminRequestSchema.parse({
        op: "verify",
        from: "2026-09-01T00:00:00.000Z",
      }).op,
    ).toBe("verify");
    expect(auditAdminRequestSchema.parse({ op: "setRetention", days: 90 }).op).toBe("setRetention");
    expect(auditAdminRequestSchema.parse({ op: "setRetention", days: null }).op).toBe(
      "setRetention",
    );
    expect(auditAdminRequestSchema.safeParse({ op: "setRetention", days: 0 }).success).toBe(false);
    expect(
      auditAdminRequestSchema.parse({
        op: "append",
        action: "watchlist:create",
        entity_type: "watchlists",
        user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }).op,
    ).toBe("append");
    expect(
      auditAdminRequestSchema.safeParse({ op: "append", action: "", entity_type: "watchlists" })
        .success,
    ).toBe(false);
  });

  it("parses list and chain envelopes", () => {
    expect(
      auditAdminListResponseSchema.parse({
        rows: [],
        total: 0,
        can_write: false,
      }).total,
    ).toBe(0);
    expect(
      auditChainVerifyResultSchema.parse({
        ok: true,
        checked: 2,
        broken_id: null,
        expected_hash: null,
        actual_hash: null,
        reason: null,
      }).ok,
    ).toBe(true);
  });
});
