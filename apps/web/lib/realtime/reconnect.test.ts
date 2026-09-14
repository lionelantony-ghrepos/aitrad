import { describe, expect, it } from "vitest";
import { runRealtimeReconnectLoop } from "./reconnect";

describe("realtime reconnect loop", () => {
  it("retries with backoff after a failed connect then reaches live", async () => {
    const states: string[] = [];
    let calls = 0;
    let disposed = false;
    const sleeps: number[] = [];
    await runRealtimeReconnectLoop({
      isDisposed: () => disposed,
      onState: (s) => states.push(s),
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      connect: async () => {
        calls += 1;
        if (calls === 1) {
          throw new Error("fail");
        }
        disposed = true;
        return {
          waitUntilClose: Promise.resolve(),
          disconnect: () => undefined,
        };
      },
    });
    expect(calls).toBe(2);
    expect(states).toContain("connecting");
    expect(states).toContain("reconnecting");
    expect(states).toContain("live");
    expect(sleeps[0]).toBe(250);
  });
});
