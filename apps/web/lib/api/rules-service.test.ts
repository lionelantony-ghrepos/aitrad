import { describe, expect, it } from "vitest";
import { invokeEvaluateDomain, rulesServiceUrl } from "./rules-service";

describe("rules-service client", () => {
  it("builds the function URL", () => {
    expect(rulesServiceUrl("https://app.insforge.app/")).toBe(
      "https://app.insforge.app/functions/rules-service",
    );
  });

  it("posts evaluateDomain and parses the outcome envelope", async () => {
    const response = await invokeEvaluateDomain({
      baseUrl: "https://app.insforge.app",
      accessToken: "tok",
      request: { domain: "pre_trade_risk", context: { order_notional: 1 } },
      fetchImpl: async (url, init) => {
        expect(String(url)).toContain("/functions/rules-service");
        expect(init?.method).toBe("POST");
        return new Response(
          JSON.stringify({
            outcome: { decision: "allow" },
            matchedRows: [],
            trace: [],
            auditId: "11111111-1111-4111-8111-111111111111",
            tableVersions: [{ table_key: "DT-RISK-01", version: 1 }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });
    expect(response.outcome).toEqual({ decision: "allow" });
  });
});
