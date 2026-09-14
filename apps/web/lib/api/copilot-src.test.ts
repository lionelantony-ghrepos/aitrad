import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { invokeCopilotDecide, parseSseBlock } from "./copilot";

const here = fileURLToPath(new URL(".", import.meta.url));
const src = readFileSync(
  path.join(here, "../../../../insforge/functions/copilot-orchestrator-src.ts"),
  "utf8",
);
const panel = readFileSync(path.join(here, "../../components/workspace/copilot-panel.tsx"), "utf8");
const decideAction = readFileSync(path.join(here, "../../app/actions/copilot-actions.ts"), "utf8");
const repo = readFileSync(path.join(here, "./copilot-actions.ts"), "utf8");

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
    expect(src).toContain("propose_order");
    expect(src).toContain("create_watchlist_item");
    expect(src).toContain("handleWriteToolCall");
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
    expect(src).toMatch(/persistAction:[\s\S]*persistOwnedCopilotAction/);
    expect(src).toMatch(/persistOwnedCopilotAction[\s\S]*requireOwnedCopilotSession/);
    expect(src).toContain("insertOwnedWatchlistItemAsAdmin");
    expect(src).toMatch(/from\("watchlists"\)[\s\S]*eq\("user_id", userId\)[\s\S]*eq\("id", id\)/);
    expect(src).toContain("count_user_monitors");
    expect(src).toContain("compileMonitorInstruction");
    expect(src).toContain('.from("monitors")');
    expect(src).toContain('action: "copilot:act"');
    expect(src).toContain('op: "decide"');
  });

  it("panel uses the repository/action path and citation chips", () => {
    expect(panel).toContain("streamCopilotChat");
    expect(panel).toContain("listCopilotSessionsAction");
    expect(panel).toContain("copilot-citation");
    expect(panel).toContain("copilot-approval-card");
    expect(panel).toContain("copilot-tab-monitors");
    expect(panel).toContain("Ask about");
    expect(panel).not.toContain("createAdminClient");
  });

  it("live approve/reject goes through orchestrator decide, not JWT PATCH", () => {
    expect(decideAction).toContain("invokeCopilotDecide");
    expect(decideAction).not.toContain("repo.update");
    expect(decideAction).not.toContain("repo.insert");
    expect(decideAction).not.toContain("createAuditLogRepository");
    expect(repo).not.toContain("client.insert");
    expect(repo).not.toContain("client.update");
    expect(repo).toContain("client.list");
  });

  it("parses SSE data frames", () => {
    const event = parseSseBlock('data: {"type":"token","text":"AAPL"}');
    expect(event).toEqual({ type: "token", text: "AAPL" });
  });

  it("invokeCopilotDecide posts op decide to the orchestrator", async () => {
    const action = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      user_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      session_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      tool: "propose_order" as const,
      payload: { symbol: "AAPL", side: "buy", qty: 10 },
      policy_outcome: { decision: "require_approval" },
      status: "executed" as const,
      executed_ref: "order-1",
      reject_reason: null,
      created_at: "2026-09-14T00:00:00.000Z",
      updated_at: "2026-09-14T00:00:00.000Z",
    };
    const result = await invokeCopilotDecide({
      baseUrl: "https://app.insforge.app",
      accessToken: "tok",
      request: { action_id: action.id, decision: "approve" },
      fetchImpl: async (url, init) => {
        expect(String(url)).toBe("https://app.insforge.app/functions/copilot-orchestrator/decide");
        expect(JSON.parse(String(init?.body))).toEqual({
          op: "decide",
          action_id: action.id,
          decision: "approve",
        });
        return new Response(JSON.stringify({ action }), { status: 200 });
      },
    });
    expect(result.id).toBe(action.id);
  });
});
