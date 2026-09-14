import { describe, expect, it } from "vitest";
import { compileMonitorInstruction, compileMonitorInstructionWithLlm } from "./monitor-compiler";
import { explainCompiledMonitor } from "./monitor-explain";
import { MONITOR_GOLDEN_EXPECTED } from "./monitor-golden";

describe("monitor compiler golden suite @TC-027-01", () => {
  it("compiles 10 canned instructions to the expected condition JSON", () => {
    expect(MONITOR_GOLDEN_EXPECTED).toHaveLength(10);
    for (const row of MONITOR_GOLDEN_EXPECTED) {
      expect(compileMonitorInstruction(row.nl), row.nl).toEqual(row.expected);
    }
  });

  it("retries once when LLM JSON fails Zod @TC-027-01", async () => {
    let calls = 0;
    const compiled = await compileMonitorInstructionWithLlm({
      nl_instruction: "ping me when FOO does a weird thing",
      completeJson: async () => {
        calls += 1;
        if (calls === 1) {
          return '{"scope":{"kind":"portfolio"},"compiled_condition":{"id":"x","priority":1,"conditions":[{"input":"not_a_fact","op":"gt","value":1}],"outputs":{"decision":"fire"}}}';
        }
        return JSON.stringify({
          name: "FOO",
          cadence: "5m",
          scope: { kind: "portfolio" },
          compiled_condition: {
            id: "monitor",
            priority: 1,
            conditions: [{ input: "portfolio_day_pct", op: "lte", value: -1 }],
            outputs: { decision: "fire" },
          },
          propose_action: null,
        });
      },
    });
    expect(calls).toBe(2);
    expect(compiled.compiled_condition.conditions[0]?.input).toBe("portfolio_day_pct");
  });
});

describe("explainCompiledMonitor @TC-027-03", () => {
  it("renders the compiled condition in plain English", () => {
    const compiled = compileMonitorInstruction("tell me if any position drops 5% in a day");
    expect(compiled).not.toBeNull();
    if (!compiled) {
      return;
    }
    const text = explainCompiledMonitor(compiled.compiled_condition, compiled.scope);
    expect(text).toMatch(/portfolio/i);
    expect(text).toMatch(/position day change/i);
    expect(text).toContain("-5");
  });
});
