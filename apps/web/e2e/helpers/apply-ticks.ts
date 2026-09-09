import type { Page } from "@playwright/test";
import type { MatchTick } from "@meridian/schemas";
import { TEST_ORDERS_CHANGED_EVENT } from "../../lib/orders/orders-live";
import { TEST_POSITIONS_CHANGED_EVENT } from "../../lib/portfolio/positions-live";

export async function applyStubTicks(page: Page, ticks: MatchTick[]): Promise<void> {
  const result = await page.evaluate(
    async (payload) => {
      const response = await fetch("/api/e2e/apply-ticks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { ok: response.ok, status: response.status };
    },
    { ticks },
  );
  if (!result.ok) {
    throw new Error(`APPLY_TICKS_${result.status}`);
  }
  await page.evaluate(
    (events) => {
      for (const eventName of events) {
        window.dispatchEvent(new Event(eventName));
      }
    },
    [TEST_POSITIONS_CHANGED_EVENT, TEST_ORDERS_CHANGED_EVENT],
  );
}
