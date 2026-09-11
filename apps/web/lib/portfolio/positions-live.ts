export const TEST_POSITIONS_CHANGED_EVENT = "meridian:positions-changed";

export type PositionsUnsubscribe = () => void;

export type PositionsLiveTransport = {
  subscribe: (onEvent: () => void) => PositionsUnsubscribe;
};

export function notifyPositionsChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(TEST_POSITIONS_CHANGED_EVENT));
}

export function createWindowPositionsTransport(): PositionsLiveTransport {
  return {
    subscribe(onEvent) {
      const handler = (): void => {
        onEvent();
      };
      window.addEventListener(TEST_POSITIONS_CHANGED_EVENT, handler);
      return () => {
        window.removeEventListener(TEST_POSITIONS_CHANGED_EVENT, handler);
      };
    },
  };
}

export function createInsforgePositionsTransport(userId: string): PositionsLiveTransport {
  const channel = `positions:${userId}`;
  return {
    subscribe(onEvent) {
      let disposed = false;
      let off: (() => void) | undefined;
      void import("@insforge/sdk/ssr").then(({ createBrowserClient }) => {
        if (disposed) {
          return;
        }
        const client = createBrowserClient();
        void (async () => {
          await client.realtime.connect();
          if (disposed) {
            return;
          }
          await client.realtime.subscribe(channel);
          if (disposed) {
            return;
          }
          const handler = (): void => {
            onEvent();
          };
          client.realtime.on("position", handler);
          off = () => {
            client.realtime.off("position", handler);
          };
        })();
      });
      return () => {
        disposed = true;
        off?.();
      };
    },
  };
}
