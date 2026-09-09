import type { Page } from "@playwright/test";
import type { MatchTick } from "@meridian/schemas";

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
}
