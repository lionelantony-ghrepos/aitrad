import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

const here = fileURLToPath(new URL(".", import.meta.url));
const src = readFileSync(
  path.join(here, "../../../../insforge/functions/alert-runner-src.ts"),
  "utf8",
);

describe("alert-runner source", () => {
  it("is service-key gated, evaluates alerting via rules-service, and publishes alerts", () => {
    expect(src).toContain("UNAUTHENTICATED");
    expect(src).toContain('Deno.env.get("API_KEY") ?? Deno.env.get("INSFORGE_API_KEY")');
    expect(src).toContain("runAlertCycle");
    expect(src).toContain('domain: "alerting"');
    expect(src).toContain("/functions/rules-service");
    expect(src).toContain('action: "alert:fire"');
    expect(src).toContain('admin.database.rpc("publish_alert_event"');
    expect(src).toContain('.from("alert_rules")');
    expect(src).toContain('.from("alerts")');
  });
});
