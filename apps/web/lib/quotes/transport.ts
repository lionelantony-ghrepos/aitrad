import { quoteTickBatchSchema, type QuoteTickBatch } from "@meridian/schemas";
import { runRealtimeReconnectLoop } from "@/lib/realtime/reconnect";
import { useRealtimeConnection } from "@/lib/realtime/store";

export const TEST_TICK_BATCH_EVENT = "meridian:tick_batch";

export function parseTickBatchPayload(raw: unknown): QuoteTickBatch | null {
  const direct = quoteTickBatchSchema.safeParse(raw);
  if (direct.success) {
    return direct.data;
  }
  if (raw && typeof raw === "object") {
    if ("payload" in raw) {
      const nested = quoteTickBatchSchema.safeParse((raw as { payload: unknown }).payload);
      if (nested.success) {
        return nested.data;
      }
    }
    if ("data" in raw) {
      const nested = quoteTickBatchSchema.safeParse((raw as { data: unknown }).data);
      if (nested.success) {
        return nested.data;
      }
    }
  }
  return null;
}

export type QuotesUnsubscribe = () => void;

export type QuotesTransport = {
  subscribe: (onBatch: (batch: QuoteTickBatch) => void) => QuotesUnsubscribe;
};

export function createWindowQuotesTransport(): QuotesTransport {
  return {
    subscribe(onBatch) {
      useRealtimeConnection.getState().setConnection("live");
      const handler = (event: Event): void => {
        const detail = (event as CustomEvent<unknown>).detail;
        const batch = parseTickBatchPayload(detail);
        if (batch) {
          useRealtimeConnection.getState().noteTick();
          onBatch(batch);
        }
      };
      window.addEventListener(TEST_TICK_BATCH_EVENT, handler);
      return () => {
        window.removeEventListener(TEST_TICK_BATCH_EVENT, handler);
      };
    },
  };
}

export function createInsforgeQuotesTransport(): QuotesTransport {
  return {
    subscribe(onBatch) {
      let disposed = false;
      let off: (() => void) | undefined;
      void runRealtimeReconnectLoop({
        isDisposed: () => disposed,
        onState: (state) => useRealtimeConnection.getState().setConnection(state),
        connect: async () => {
          const { createBrowserClient } = await import("@insforge/sdk/ssr");
          const client = createBrowserClient();
          await client.realtime.connect();
          if (disposed) {
            return {
              waitUntilClose: Promise.resolve(),
              disconnect: () => undefined,
            };
          }
          await client.realtime.subscribe("quotes");
          const handler = (payload: unknown): void => {
            const batch = parseTickBatchPayload(payload);
            if (batch) {
              useRealtimeConnection.getState().noteTick();
              onBatch(batch);
            }
          };
          client.realtime.on("tick_batch", handler);
          off = () => {
            client.realtime.off("tick_batch", handler);
          };
          let close!: () => void;
          const waitUntilClose = new Promise<void>((resolve) => {
            close = resolve;
            const rt = client.realtime as { on?: (event: string, cb: () => void) => void };
            rt.on?.("disconnect", resolve);
            rt.on?.("close", resolve);
          });
          return {
            waitUntilClose,
            disconnect: () => {
              off?.();
              close();
            },
          };
        },
      });
      return () => {
        disposed = true;
        off?.();
      };
    },
  };
}
