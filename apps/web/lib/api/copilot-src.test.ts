import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { parseSseBlock } from "./copilot";

const here = fileURLToPath(new URL(".", import.meta.url));
const src = readFileSync(
  path.join(here, "../../../../insforge/functions/copilot-orchestrator-src.ts"),
  "utf8",
);
const panel = readFileSync(path.join(here, "../../components/workspace/copilot-panel.tsx"), "utf8");

describe("copilot-orchestrator source contracts", () => {
  it("authorizes, audits tools, and binds the read registry", () => {
    expect(src).toContain('action: "copilot:chat"');
    expect(src).toContain("authorizeEdgeUser");
    expect(src).toContain("audit_log");
    expect(src).toContain("copilot:tool:");
    expect(src).toContain("get_quote");
    expect(src).toContain("get_bars");
    expect(src).toContain("search_news");
    expect(src).toContain("get_fundamentals");
    expect(src).toContain("screen_instruments");
    expect(src).toContain("get_portfolio");
    expect(src).toContain("explain_rule_decision");
    expect(src).toContain("ai_action_policy");
    expect(src).toContain("requireOwnedCopilotSession");
    expect(src).toContain("SESSION_NOT_FOUND");
    expect(src).toContain('.eq("user_id", userId)');
    expect(src).toMatch(/async appendMessage[\s\S]*requireOwnedCopilotSession/);
    expect(src).toMatch(/async loadHistory[\s\S]*requireOwnedCopilotSession/);
    expect(src).not.toContain("docs/kb");
    expect(src).toContain("requireOwnedCopilotSession");
    expect(src).toContain('.eq("user_id", userId)');
    expect(src).toContain("COPILOT_SESSION_NOT_FOUND");
  });

  it("panel uses the repository/action path and citation chips", () => {
    expect(panel).toContain("streamCopilotChat");
    expect(panel).toContain("listCopilotSessionsAction");
    expect(panel).toContain("copilot-citation");
    expect(panel).toContain("Ask about");
    expect(panel).not.toContain("createAdminClient");
  });

  it("parses SSE data frames", () => {
    const event = parseSseBlock('data: {"type":"token","text":"AAPL"}');
    expect(event).toEqual({ type: "token", text: "AAPL" });
  });
});
