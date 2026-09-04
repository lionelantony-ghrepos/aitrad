import { quoteTickBatchSchema, type QuoteTickBatch } from "@meridian/schemas";

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
      const handler = (event: Event): void => {
        const detail = (event as CustomEvent<unknown>).detail;
        const batch = parseTickBatchPayload(detail);
        if (batch) {
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
          await client.realtime.subscribe("quotes");
          if (disposed) {
            return;
          }
          const handler = (payload: unknown): void => {
            const batch = parseTickBatchPayload(payload);
            if (batch) {
              onBatch(batch);
            }
          };
          client.realtime.on("tick_batch", handler);
          off = () => {
            client.realtime.off("tick_batch", handler);
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
