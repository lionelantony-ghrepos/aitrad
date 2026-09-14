import { describe, expect, it } from "vitest";
import type { CopilotAction } from "@meridian/schemas";
import {
  decidePersistedAction,
  evaluateWritePolicyBaseline,
  handleWriteToolCall,
  writeDecisionFromOutcome,
  writePolicyContext,
  type WriteActionPorts,
} from "./write-actions";
import { summarizeWritePayload } from "./write-summary";

const USER = "11111111-1111-4111-8111-111111111111";
const SESSION = "22222222-2222-4222-8222-222222222222";

function memoryPorts(execute: WriteActionPorts["execute"]): {
  ports: WriteActionPorts;
  store: CopilotAction[];
  executeCalls: number;
} {
  const store: CopilotAction[] = [];
  const clock = new Date("2026-09-14T14:00:00.000Z");
  let n = 0;
  const ports: WriteActionPorts = {
    now: () => clock,
    newId: () => {
      n += 1;
      return `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${n}`;
    },
    evaluatePolicy: async (context) => evaluateWritePolicyBaseline(context, clock),
    persistAction: async (row) => {
      store.push(row);
      return row;
    },
    updateAction: async (row) => {
      const idx = store.findIndex((item) => item.id === row.id);
      if (idx >= 0) {
        store[idx] = row;
      }
      return row;
    },
    execute: async (tool, payload) => {
      executeCalls += 1;
      return execute(tool, payload);
    },
  };
  let executeCalls = 0;
  return {
    ports,
    store,
    get executeCalls() {
      return executeCalls;
    },
    set executeCalls(value: number) {
      executeCalls = value;
    },
  } as {
    ports: WriteActionPorts;
    store: CopilotAction[];
    executeCalls: number;
  };
}

describe("TC-026-01 propose_order never hits order-service without approval @TC-026-01", () => {
  it("requires approval and does not call execute", async () => {
    const { ports, store } = memoryPorts(async () => ({ ref: "ORDER_SHOULD_NOT_EXIST" }));
    let executeCalls = 0;
    const wrapped: WriteActionPorts = {
      ...ports,
      execute: async (tool, payload) => {
        executeCalls += 1;
        return ports.execute(tool, payload);
      },
    };
    const result = await handleWriteToolCall({
      userId: USER,
      sessionId: SESSION,
      tool: "propose_order",
      args: { symbol: "AAPL", side: "buy", qty: 10, order_type: "market", last_price: 189.6 },
      actionsToday: 0,
      monitorsCount: 0,
      ports: wrapped,
    });
    expect(writeDecisionFromOutcome({ decision: "require_approval" })).toBe("require_approval");
    expect(result.status).toBe("awaiting_approval");
    expect(result.action?.status).toBe("proposed");
    expect(executeCalls).toBe(0);
    expect(store.every((row) => row.executed_ref === null)).toBe(true);
    expect(summarizeWritePayload("propose_order", result.action?.payload ?? {})).toContain("BUY");
  });
});

describe("TC-026-02 approved order still runs trade rules @TC-026-02", () => {
  it("approve path calls execute and can surface a DT-RISK-01 reason", async () => {
    let executeCalls = 0;
    const { ports } = memoryPorts(async () => ({
      ref: "33333333-3333-4333-8333-333333333333",
      reject_reason: "RISK_NO_SHORTING",
    }));
    const wrapped: WriteActionPorts = {
      ...ports,
      execute: async (tool, payload) => {
        executeCalls += 1;
        expect(tool).toBe("propose_order");
        return ports.execute(tool, payload);
      },
    };
    const proposed = await handleWriteToolCall({
      userId: USER,
      sessionId: SESSION,
      tool: "propose_order",
      args: { symbol: "AAPL", side: "sell", qty: 10, order_type: "market", last_price: 189.6 },
      actionsToday: 0,
      monitorsCount: 0,
      ports: wrapped,
    });
    expect(executeCalls).toBe(0);
    const proposedAction = proposed.action;
    expect(proposedAction).toBeDefined();
    if (!proposedAction) {
      throw new Error("expected proposed action");
    }
    const finished = await decidePersistedAction({
      action: proposedAction,
      decision: "approve",
      ports: wrapped,
    });
    expect(executeCalls).toBe(1);
    expect(finished.status).toBe("executed");
    expect(finished.reject_reason).toBe("RISK_NO_SHORTING");
  });
});

describe("TC-026-03 auto-approve watchlist + audit hook @TC-026-03", () => {
  it("executes create_watchlist_item immediately under DT-AI-01", async () => {
    let executeCalls = 0;
    const audits: string[] = [];
    const { ports } = memoryPorts(async () => ({ ref: "watch-item-1" }));
    const wrapped: WriteActionPorts = {
      ...ports,
      execute: async (tool, payload) => {
        executeCalls += 1;
        audits.push(`copilot:tool:${tool}`);
        return ports.execute(tool, payload);
      },
    };
    const ctx = writePolicyContext({
      tool: "create_watchlist_item",
      actions_today: 0,
      monitors_count: 0,
      payload: { symbol: "NVDA" },
    });
    expect(writeDecisionFromOutcome(evaluateWritePolicyBaseline(ctx))).toBe("auto_approve");
    const result = await handleWriteToolCall({
      userId: USER,
      sessionId: SESSION,
      tool: "create_watchlist_item",
      args: { symbol: "NVDA" },
      actionsToday: 0,
      monitorsCount: 0,
      ports: wrapped,
    });
    expect(result.status).toBe("executed");
    expect(executeCalls).toBe(1);
    expect(audits).toEqual(["copilot:tool:create_watchlist_item"]);
    expect(result.action?.status).toBe("executed");
    expect(result.executed_ref).toBe("watch-item-1");
  });
});
