import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const src = readFileSync(
  path.join(here, "../../../../insforge/functions/monitor-runner-src.ts"),
  "utf8",
);

describe("monitor-runner source", () => {
  it("is service-key gated, throttles via alerting, and writes monitor alerts", () => {
    expect(src).toContain("UNAUTHENTICATED");
    expect(src).toContain('Deno.env.get("API_KEY") ?? Deno.env.get("INSFORGE_API_KEY")');
    expect(src).toContain("runMonitorCycle");
    expect(src).toContain('domain: "alerting"');
    expect(src).toContain("/functions/rules-service");
    expect(src).toContain("search_news_hybrid");
    expect(src).toContain('action: "monitor:fire"');
    expect(src).toContain('admin.database.rpc("publish_alert_event"');
    expect(src).toContain('.from("monitors")');
    expect(src).toContain("force_position_day_pct");
    expect(src).not.toContain("docs/kb");
  });
});
