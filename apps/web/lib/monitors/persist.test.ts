import { describe, expect, it } from "vitest";
import { ownerPausePatch, ownerThrottleResetPatch } from "./persist";

describe("monitor owner patches", () => {
  it("pause sets throttle_state.paused without dropping other keys", () => {
    expect(ownerPausePatch(false, { last_fired_at: "2026-09-14T14:00:00.000Z" })).toEqual({
      active: false,
      throttle_state: { last_fired_at: "2026-09-14T14:00:00.000Z", paused: true },
    });
    expect(ownerPausePatch(true, { paused: true })).toEqual({
      active: true,
      throttle_state: { paused: false },
    });
  });

  it("JWT reset POST-equivalent is empty throttle_state", () => {
    expect(ownerThrottleResetPatch()).toEqual({ throttle_state: {} });
  });
});
