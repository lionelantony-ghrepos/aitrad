import { describe, expect, it } from "vitest";
import { copilotOrchestratorUrl } from "./copilot";
import { functionsUrl } from "./functions";

describe("functionsUrl", () => {
  it("builds the compat invoke path", () => {
    expect(functionsUrl("https://app.insforge.app/", "provision-account")).toBe(
      "https://app.insforge.app/functions/provision-account",
    );
  });

  it("builds copilot orchestrator chat and decide paths", () => {
    expect(copilotOrchestratorUrl("https://app.insforge.app/")).toBe(
      "https://app.insforge.app/functions/copilot-orchestrator",
    );
    expect(copilotOrchestratorUrl("https://app.insforge.app", "decide")).toBe(
      "https://app.insforge.app/functions/copilot-orchestrator/decide",
    );
  });
});
