import { newsRealtimeBatchSchema, type NewsItem, type NewsRealtimeBatch } from "@meridian/schemas";

export const TEST_NEWS_BATCH_EVENT = "meridian:news_batch";

export function parseNewsBatchPayload(raw: unknown): NewsRealtimeBatch | null {
  const direct = newsRealtimeBatchSchema.safeParse(raw);
  if (direct.success) {
    return direct.data;
  }
  if (raw && typeof raw === "object") {
    if ("payload" in raw) {
      const nested = newsRealtimeBatchSchema.safeParse((raw as { payload: unknown }).payload);
      if (nested.success) {
        return nested.data;
      }
    }
    if ("data" in raw) {
      const nested = newsRealtimeBatchSchema.safeParse((raw as { data: unknown }).data);
      if (nested.success) {
        return nested.data;
      }
    }
  }
  return null;
}

export type NewsUnsubscribe = () => void;

export type NewsTransport = {
  subscribe: (onBatch: (batch: NewsRealtimeBatch) => void) => NewsUnsubscribe;
};

export function mergeNewsItems(
  current: readonly NewsItem[],
  incoming: readonly NewsItem[],
): NewsItem[] {
  const byId = new Map(current.map((row) => [row.id, row]));
  for (const row of incoming) {
    byId.set(row.id, row);
  }
  return [...byId.values()].sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
}

export function createWindowNewsTransport(): NewsTransport {
  return {
    subscribe(onBatch) {
      const handler = (event: Event): void => {
        const detail = (event as CustomEvent<unknown>).detail;
        const batch = parseNewsBatchPayload(detail);
        if (batch) {
          onBatch(batch);
        }
      };
      window.addEventListener(TEST_NEWS_BATCH_EVENT, handler);
      return () => {
        window.removeEventListener(TEST_NEWS_BATCH_EVENT, handler);
      };
    },
  };
}

export function createInsforgeNewsTransport(): NewsTransport {
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
          await client.realtime.subscribe("news");
          if (disposed) {
            return;
          }
          const handler = (payload: unknown): void => {
            const batch = parseNewsBatchPayload(payload);
            if (batch) {
              onBatch(batch);
            }
          };
          client.realtime.on("news_batch", handler);
          off = () => {
            client.realtime.off("news_batch", handler);
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
