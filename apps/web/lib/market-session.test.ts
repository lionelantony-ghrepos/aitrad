import { describe, expect, it } from "vitest";
import { formatNyClock, nyseSessionState } from "./market-session";

describe("nyseSessionState (TC-003-02)", () => {
  it("returns OPEN on a weekday during regular hours in America/New_York", () => {
    // Wednesday 2026-09-02 10:00 ET (EDT, UTC-4)
    const now = new Date("2026-09-02T14:00:00.000Z");
    expect(nyseSessionState(now)).toBe("OPEN");
  });

  it("returns CLOSED on a weekday after the regular close", () => {
    // Wednesday 2026-09-02 16:30 ET
    const now = new Date("2026-09-02T20:30:00.000Z");
    expect(nyseSessionState(now)).toBe("CLOSED");
  });

  it("returns CLOSED on Saturday", () => {
    const now = new Date("2026-09-05T14:00:00.000Z");
    expect(nyseSessionState(now)).toBe("CLOSED");
  });

  it("returns CLOSED on a full NYSE holiday (Thanksgiving 2026)", () => {
    const now = new Date("2026-11-26T15:00:00.000Z");
    expect(nyseSessionState(now)).toBe("CLOSED");
  });

  it("returns OPEN on a half-day before the early close", () => {
    // Friday 2026-11-27 10:00 ET (day after Thanksgiving, half day)
    const now = new Date("2026-11-27T15:00:00.000Z");
    expect(nyseSessionState(now)).toBe("OPEN");
  });

  it("returns CLOSED on a half-day after the early close", () => {
    // Friday 2026-11-27 13:30 ET
    const now = new Date("2026-11-27T18:30:00.000Z");
    expect(nyseSessionState(now)).toBe("CLOSED");
  });
});

describe("formatNyClock", () => {
  it("formats a wall clock in America/New_York", () => {
    const now = new Date("2026-09-02T14:00:00.000Z");
    expect(formatNyClock(now)).toMatch(/10:00:00/);
  });
});
