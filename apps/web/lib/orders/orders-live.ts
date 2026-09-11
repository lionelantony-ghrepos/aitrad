import { orderRealtimeEventSchema, type OrderRealtimeEvent } from "@meridian/schemas";

export const TEST_ORDERS_CHANGED_EVENT = "meridian:orders-changed";

export function parseOrderRealtimePayload(raw: unknown): OrderRealtimeEvent | null {
  const direct = orderRealtimeEventSchema.safeParse(raw);
  if (direct.success) {
    return direct.data;
  }
  if (raw && typeof raw === "object") {
    if ("payload" in raw) {
      const nested = orderRealtimeEventSchema.safeParse((raw as { payload: unknown }).payload);
      if (nested.success) {
        return nested.data;
      }
    }
    if ("data" in raw) {
      const nested = orderRealtimeEventSchema.safeParse((raw as { data: unknown }).data);
      if (nested.success) {
        return nested.data;
      }
    }
  }
  return null;
}

export type OrdersUnsubscribe = () => void;

export type OrdersLiveTransport = {
  subscribe: (
    onEvent: (event: OrderRealtimeEvent | { kind: "refresh" }) => void,
  ) => OrdersUnsubscribe;
};

export function notifyOrdersChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(TEST_ORDERS_CHANGED_EVENT));
}

export function createWindowOrdersTransport(): OrdersLiveTransport {
  return {
    subscribe(onEvent) {
      const handler = (): void => {
        onEvent({ kind: "refresh" });
      };
      window.addEventListener(TEST_ORDERS_CHANGED_EVENT, handler);
      return () => {
        window.removeEventListener(TEST_ORDERS_CHANGED_EVENT, handler);
      };
    },
  };
}

export function createInsforgeOrdersTransport(userId: string): OrdersLiveTransport {
  const channel = `orders:${userId}`;
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
            const event = parseOrderRealtimePayload(payload);
            if (event) {
              onEvent(event);
            }
          };
          client.realtime.on("order", handler);
          off = () => {
            client.realtime.off("order", handler);
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
