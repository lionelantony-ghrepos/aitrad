import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const newsAction = readFileSync(path.join(here, "../../app/actions/news.ts"), "utf8");
const newsPanel = readFileSync(
  path.join(here, "../../components/workspace/news-panel.tsx"),
  "utf8",
);

describe("listNewsAction security", () => {
  it("requires a session JWT and uses that token for records reads", () => {
    expect(newsAction).toContain("getSessionUser");
    expect(newsAction).toContain("getAccessToken");
    expect(newsAction).toContain("You must be signed in.");
    expect(newsAction).toContain("getAccessToken: () => session.token");
    expect(newsAction).not.toContain("createAdminClient");
    expect(newsAction).not.toContain("INSFORGE_API_KEY");
  });

  it("does not put a service-role client in the News panel", () => {
    expect(newsPanel).toContain("listNewsAction");
    expect(newsPanel).not.toContain("createAdminClient");
    expect(newsPanel).not.toContain("INSFORGE_API_KEY");
    expect(newsPanel).not.toContain("service_role");
  });
});
