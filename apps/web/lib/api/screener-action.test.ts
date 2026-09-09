import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const screenerAction = readFileSync(path.join(here, "../../app/actions/screener.ts"), "utf8");
const screenerPanel = readFileSync(
  path.join(here, "../../components/workspace/screener-panel.tsx"),
  "utf8",
);
const screenerClient = readFileSync(path.join(here, "./screener.ts"), "utf8");

describe("screener client and actions security", () => {
  it("runs /functions/screener with the session JWT, not a service-role key", () => {
    expect(screenerAction).toContain("getSessionUser");
    expect(screenerAction).toContain("getAccessToken");
    expect(screenerAction).toContain("You must be signed in.");
    expect(screenerAction).toContain(
      'authorize({ userId: session.userId, action: "screener:run" })',
    );
    expect(screenerAction).toContain("accessToken: session.token");
    expect(screenerAction).toContain("invokeScreenerRun");
    expect(screenerAction).not.toContain("createAdminClient");
    expect(screenerAction).not.toContain("INSFORGE_API_KEY");
    expect(screenerClient).toContain('functionsUrl(baseUrl, "screener")');
    expect(screenerClient).toContain("Authorization: `Bearer ${input.accessToken}`");
    expect(screenerClient).not.toContain("INSFORGE_API_KEY");
    expect(screenerPanel).not.toContain("createAdminClient");
    expect(screenerPanel).not.toContain("INSFORGE_API_KEY");
    expect(screenerPanel).not.toContain("service_role");
  });
});
