import type { Page } from "@playwright/test";

export async function forceNextStubOrderReject(page: Page): Promise<void> {
  const result = await page.evaluate(async () => {
    const response = await fetch("/api/e2e/force-order-reject", {
      method: "POST",
      credentials: "include",
    });
    return { ok: response.ok, status: response.status };
  });
  if (!result.ok) {
    throw new Error(`FORCE_ORDER_REJECT_${result.status}`);
  }
}
