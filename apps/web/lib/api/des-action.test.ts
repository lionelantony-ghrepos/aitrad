import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const desAction = readFileSync(path.join(here, "../../app/actions/des.ts"), "utf8");
const desPanel = readFileSync(path.join(here, "../../components/workspace/des-panel.tsx"), "utf8");

describe("getDesProfileAction security", () => {
  it("requires a session JWT and uses that token for records reads", () => {
    expect(desAction).toContain("getSessionUser");
    expect(desAction).toContain("getAccessToken");
    expect(desAction).toContain("You must be signed in.");
    expect(desAction).toContain("getAccessToken: () => session.token");
    expect(desAction).not.toContain("createAdminClient");
    expect(desAction).not.toContain("INSFORGE_API_KEY");
  });

  it("does not write fundamentals (no edge/admin client, reads only)", () => {
    expect(desAction).not.toContain("createAdminClient");
    expect(desAction).not.toContain(".insert(");
    expect(desAction).not.toContain(".upsert(");
    expect(desAction).not.toContain("/functions/");
    expect(desPanel).not.toContain("createAdminClient");
    expect(desPanel).not.toContain("service_role");
  });
});
