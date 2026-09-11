import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const src = readFileSync(
  path.join(here, "../../../../insforge/functions/news-ticker-src.ts"),
  "utf8",
);

describe("news-ticker source", () => {
  it("is service-key gated, writes audit_log, and publishes news_batch", () => {
    expect(src).toContain("UNAUTHENTICATED");
    expect(src).toContain("planNewsTickerInvocation");
    expect(src).toContain('action: "news-ticker"');
    expect(src).toContain("publish_news_batch");
    expect(src).toContain("NEWS_TICKER_INTERVAL_SECONDS");
    expect(src).toContain("/functions/alert-runner");
    expect(src).toContain("/functions/embed-worker");
  });

  it("requires API_KEY / INSFORGE_API_KEY and upserts via createAdminClient", () => {
    expect(src).toContain('Deno.env.get("API_KEY") ?? Deno.env.get("INSFORGE_API_KEY")');
    expect(src).toContain("createAdminClient");
    expect(src).toContain('.from("news_items").upsert');
    expect(src).toContain('admin.database.rpc("publish_news_batch"');
  });
});
