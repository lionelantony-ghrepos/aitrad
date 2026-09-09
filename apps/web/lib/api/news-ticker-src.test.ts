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
  });
});
