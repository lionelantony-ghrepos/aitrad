import { describe, expect, it } from "vitest";
import {
  adminUsersAssignResponseSchema,
  adminUsersListResponseSchema,
  adminUsersRequestSchema,
  userRoleSchema,
} from "./admin-users";

describe("admin-users DTOs", () => {
  it("parses list and assign ops", () => {
    expect(userRoleSchema.parse("compliance")).toBe("compliance");
    expect(adminUsersRequestSchema.parse({ op: "list" }).op).toBe("list");
    expect(
      adminUsersRequestSchema.parse({
        op: "assign",
        user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        role: "admin",
      }),
    ).toMatchObject({ op: "assign", role: "admin" });
    expect(
      adminUsersRequestSchema.safeParse({ op: "assign", user_id: "x", role: "admin" }).success,
    ).toBe(false);
  });

  it("parses list/assign envelopes", () => {
    expect(
      adminUsersListResponseSchema.parse({
        users: [
          {
            user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            email: "a@example.com",
            display_name: "Ada",
            role: "trader",
          },
        ],
      }).users,
    ).toHaveLength(1);
    expect(
      adminUsersAssignResponseSchema.parse({
        ok: true,
        user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        role: "compliance",
      }).ok,
    ).toBe(true);
  });
});
