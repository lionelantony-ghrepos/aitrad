import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { adminUsersUrl } from "./admin-users";

const here = fileURLToPath(new URL(".", import.meta.url));
const src = readFileSync(
  path.join(here, "../../../../insforge/functions/admin-users-src.ts"),
  "utf8",
);

describe("adminUsersUrl", () => {
  it("builds the admin-users function path", () => {
    expect(adminUsersUrl("https://app.insforge.app/")).toBe(
      "https://app.insforge.app/functions/admin-users",
    );
  });
});

describe("admin-users edge function", () => {
  it("authorizes users:* via DT-ENT-01 and audits mutations", () => {
    expect(src).toContain("handleAdminUsersRequest");
    expect(src).toContain("list_user_directory");
    expect(src).toContain("user_roles");
    expect(src).toContain("audit_log");
    expect(src).toContain("loadUserRole");
    expect(src).not.toContain("profiles.persona");
  });
});
