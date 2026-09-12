import { alertRealtimeEventSchema, type AlertInstance } from "@meridian/schemas";

export const TEST_ALERTS_CHANGED_EVENT = "meridian:alerts-changed";

export function parseAlertRealtimePayload(raw: unknown): AlertInstance | null {
  const direct = alertRealtimeEventSchema.safeParse(raw);
  if (direct.success) {
    return direct.data.alert;
  }
  if (raw && typeof raw === "object") {
    if ("payload" in raw) {
      const nested = alertRealtimeEventSchema.safeParse((raw as { payload: unknown }).payload);
      if (nested.success) {
        return nested.data.alert;
      }
    }
    if ("data" in raw) {
      const nested = alertRealtimeEventSchema.safeParse((raw as { data: unknown }).data);
      if (nested.success) {
        return nested.data.alert;
      }
    }
  }
  return null;
}

export type AlertsUnsubscribe = () => void;

export type AlertsLiveTransport = {
  subscribe: (onEvent: (alert: AlertInstance | { kind: "refresh" }) => void) => AlertsUnsubscribe;
};

export function createWindowAlertsTransport(): AlertsLiveTransport {
  return {
    subscribe(onEvent) {
      const handler = (): void => {
        onEvent({ kind: "refresh" });
      };
      window.addEventListener(TEST_ALERTS_CHANGED_EVENT, handler);
      return () => {
        window.removeEventListener(TEST_ALERTS_CHANGED_EVENT, handler);
      };
    },
  };
}

export function createInsforgeAlertsTransport(userId: string): AlertsLiveTransport {
  const channel = `alerts:${userId}`;
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
          const handler = (payload: unknown): void => {
            const alert = parseAlertRealtimePayload(payload);
            if (alert) {
              onEvent(alert);
            }
          };
          client.realtime.on("alert", handler);
          off = () => {
            client.realtime.off("alert", handler);
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
