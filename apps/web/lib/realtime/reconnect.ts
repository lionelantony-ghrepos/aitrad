import { nextRealtimeBackoffMs, nextRealtimeState } from "@meridian/rules-engine";
import type { RealtimeConnectionState } from "@meridian/schemas";

export type ReconnectLoopOptions = {
  connect: () => Promise<{ waitUntilClose: Promise<void>; disconnect: () => void }>;
  onState: (state: RealtimeConnectionState) => void;
  isDisposed: () => boolean;
  sleep?: (ms: number) => Promise<void>;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function runRealtimeReconnectLoop(options: ReconnectLoopOptions): Promise<void> {
  const sleep = options.sleep ?? defaultSleep;
  let attempt = 0;
  let current: RealtimeConnectionState = "offline";
  while (!options.isDisposed()) {
    current = nextRealtimeState({
      current,
      event: attempt === 0 ? "start" : "close",
    });
    options.onState(current);
    try {
      const session = await options.connect();
      current = nextRealtimeState({ current, event: "open" });
      options.onState(current);
      attempt = 0;
      await Promise.race([
        session.waitUntilClose,
        (async () => {
          while (!options.isDisposed()) {
            await sleep(250);
          }
        })(),
      ]);
      session.disconnect();
      if (options.isDisposed()) {
        return;
      }
      current = nextRealtimeState({ current, event: "close" });
      options.onState(current);
    } catch {
      if (options.isDisposed()) {
        return;
      }
      current = nextRealtimeState({ current, event: "close" });
      options.onState(current);
    }
    const delay = nextRealtimeBackoffMs(attempt);
    attempt += 1;
    await sleep(delay);
  }
}
