import { describe, expect, it } from "vitest";
import { compileMonitorInstruction } from "@meridian/copilot";
import { persistCompiledMonitor, ownerThrottleResetPatch } from "./persist";
import { stubEvaluateMonitors } from "./evaluate-stub";
import {
  resetStubState,
  stubInsertCopilotMonitor,
  stubListMonitors,
  stubPatchMonitor,
} from "@/lib/auth/stub-store";

const USER = "33333333-3333-4333-8333-333333333333";

describe("stub monitor runner @TC-027-02 @TC-027-03", () => {
  it("fires once at forced -6% then suppresses", async () => {
    resetStubState();
    const compiled = compileMonitorInstruction("tell me if any position drops 5% in a day");
    expect(compiled).not.toBeNull();
    stubInsertCopilotMonitor(
      persistCompiledMonitor({
        userId: USER,
        nl_instruction: "tell me if any position drops 5% in a day",
        compiled,
      }),
    );
    const clock = new Date("2026-09-14T14:00:00.000Z");
    const first = await stubEvaluateMonitors({
      userId: USER,
      force_position_day_pct: -6,
      clock,
    });
    expect(first).toHaveLength(1);
    expect(first[0]?.message).toMatch(/-6/);
    expect(first[0]?.message).toMatch(/drops 5%/);
    const second = await stubEvaluateMonitors({
      userId: USER,
      force_position_day_pct: -6,
      clock: new Date(clock.getTime() + 60_000),
    });
    expect(second).toHaveLength(0);
  });

  it("paused monitor stays silent", async () => {
    resetStubState();
    const row = persistCompiledMonitor({
      userId: USER,
      nl_instruction: "tell me if any position drops 5% in a day",
    });
    row.active = false;
    stubInsertCopilotMonitor(row);
    const fired = await stubEvaluateMonitors({
      userId: USER,
      force_position_day_pct: -6,
    });
    expect(fired).toHaveLength(0);
  });

  it("JWT throttle reset allows a later forced fire", async () => {
    resetStubState();
    const compiled = compileMonitorInstruction("tell me if any position drops 5% in a day");
    expect(compiled).not.toBeNull();
    stubInsertCopilotMonitor(
      persistCompiledMonitor({
        userId: USER,
        nl_instruction: "tell me if any position drops 5% in a day",
        compiled,
      }),
    );
    const clock = new Date("2026-09-14T14:00:00.000Z");
    const first = await stubEvaluateMonitors({
      userId: USER,
      force_position_day_pct: -6,
      clock,
    });
    expect(first).toHaveLength(1);
    const listed = stubListMonitors(USER);
    const id = listed[0]?.id;
    expect(id).toBeDefined();
    if (!id) {
      return;
    }
    stubPatchMonitor(USER, id, ownerThrottleResetPatch());
    const again = await stubEvaluateMonitors({
      userId: USER,
      force_position_day_pct: -6,
      clock: new Date(clock.getTime() + 60_000),
    });
    expect(again).toHaveLength(1);
  });
});
