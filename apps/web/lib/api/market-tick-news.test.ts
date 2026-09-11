import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const src = readFileSync(
  path.join(here, "../../../../insforge/functions/market-tick-src.ts"),
  "utf8",
);

describe("market-tick news shocks", () => {
  it("only reads recent news_items for DT-SIM-01 shocks", () => {
    expect(src).toContain("newsShocksForSymbols");
    expect(src).toContain('.from("news_items")');
    expect(src).toContain('.select("ts,symbols,sentiment")');
    expect(src).toContain('.gte("ts", newsSince)');
    expect(src).not.toContain('.from("news_items").upsert');
    expect(src).not.toContain('.from("news_items").insert');
    expect(src).not.toContain("publish_news_batch");
    expect(src).toContain("/functions/alert-runner");
  });
});
