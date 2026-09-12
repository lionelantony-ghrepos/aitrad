import { expect, test } from "@playwright/test";
import { STUB_AAPL_INSTRUMENT_ID } from "../lib/auth/stub-store";
import { TEST_TICK_BATCH_EVENT } from "../lib/quotes/transport";
import { applyStubTicks } from "./helpers/apply-ticks";
import { signUpThroughWizard } from "./helpers/onboard";

async function addAaplAndForceLast(
  page: import("@playwright/test").Page,
  last: number,
): Promise<void> {
  const tab = page.getByTestId("watchlist-tab-Port").first();
  if (!(await tab.isVisible().catch(() => false))) {
    await page.getByTestId("watchlist-name").fill("Port");
    await page.getByTestId("watchlist-create").click();
    await expect(tab).toBeVisible();
  }
  const row = page.getByTestId("watchlist-row-AAPL");
  if (!(await row.isVisible().catch(() => false))) {
    await page.getByTestId("watchlist-search").fill("AAPL");
    await page.getByTestId("instrument-option-AAPL").click();
  }
  await row.click();
  await expect(page.getByTestId("order-ticket-symbol")).toHaveText("AAPL");
  const label = last.toFixed(2);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.evaluate(
      ({ eventName, instrumentId, price }) => {
        window.dispatchEvent(
          new CustomEvent(eventName, {
            detail: {
              ts: new Date().toISOString(),
              ticks: [
                {
                  instrument_id: instrumentId,
                  symbol: "AAPL",
                  bid: price - 0.1,
                  ask: price + 0.1,
                  last: price,
                  prev_close: 200,
                  volume: 2,
                  ts: new Date().toISOString(),
                },
              ],
            },
          }),
        );
      },
      { eventName: TEST_TICK_BATCH_EVENT, instrumentId: STUB_AAPL_INSTRUMENT_ID, price: last },
    );
    try {
      await expect(page.getByTestId("order-last")).toContainText(label, { timeout: 800 });
      return;
    } catch {
      /* subscribe may not be attached yet */
    }
  }
  await expect(page.getByTestId("order-last")).toContainText(label);
}

async function buyShares(page: import("@playwright/test").Page, qty: string): Promise<void> {
  await page.getByTestId("order-qty").fill(qty);
  await expect(page.getByTestId("order-submit")).toBeEnabled();
  await page.getByTestId("order-submit").click();
  await page.getByTestId("order-confirm-submit").click();
}

test.describe("PBI-018 portfolio", () => {
  test.describe.configure({ timeout: 60_000 });
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `port-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("TC-018-02 fill buy then +5% tick revalues unrealized @TC-018-02", async ({ page }) => {
    await page.goto("/workspace");
    await expect(page.getByTestId("panel-portfolio")).toBeVisible();
    await addAaplAndForceLast(page, 200);
    await buyShares(page, "10");
    await applyStubTicks(page, [
      { last: 200, symbol: "AAPL", instrument_id: STUB_AAPL_INSTRUMENT_ID },
    ]);
    await expect(
      page.locator("[data-testid^='blotter-row-'][data-symbol='AAPL']").first(),
    ).toHaveAttribute("data-status", "filled", { timeout: 8_000 });
    const row = page.getByTestId("portfolio-row-AAPL");
    await expect(row).toBeVisible({ timeout: 8_000 });
    await expect(row).toHaveAttribute("data-qty", "10");
    await addAaplAndForceLast(page, 210);
    await expect(row).toHaveAttribute("data-unrealized-pct", "5.0", { timeout: 8_000 });
    await expect(page.getByTestId("portfolio-header")).toBeVisible();
  });

  test("TC-018-03 Close prefills opposite market ticket @TC-018-03", async ({ page }) => {
    await page.goto("/workspace");
    await addAaplAndForceLast(page, 200);
    await buyShares(page, "10");
    await applyStubTicks(page, [
      { last: 200, symbol: "AAPL", instrument_id: STUB_AAPL_INSTRUMENT_ID },
    ]);
    await expect(
      page.locator("[data-testid^='blotter-row-'][data-symbol='AAPL']").first(),
    ).toHaveAttribute("data-status", "filled", { timeout: 8_000 });
    const row = page.getByTestId("portfolio-row-AAPL");
    await expect(row).toBeVisible({ timeout: 8_000 });
    await page.getByTestId("portfolio-close-AAPL").click({ force: true });
    await expect(page.getByTestId("order-ticket-symbol")).toHaveText("AAPL");
    await expect(page.getByTestId("order-side-sell")).toHaveClass(/text-down/);
    await expect(page.getByTestId("order-qty")).toHaveValue("10");
    await expect(page.getByTestId("order-type")).toHaveValue("market");
  });
});
