import { expect, test } from "@playwright/test";
import { STUB_AAPL_INSTRUMENT_ID } from "../lib/auth/stub-store";
import { TEST_TICK_BATCH_EVENT } from "../lib/quotes/transport";
import { applyStubTicks } from "./helpers/apply-ticks";
import { signUpThroughWizard } from "./helpers/onboard";

async function addAaplAndForceLast(
  page: import("@playwright/test").Page,
  last: number,
): Promise<void> {
  await page.getByTestId("watchlist-name").fill("Adv016");
  await page.getByTestId("watchlist-create").click();
  await expect(page.getByTestId("watchlist-tab-Adv016")).toBeVisible();
  await page.getByTestId("watchlist-search").fill("AAPL");
  await page.getByTestId("instrument-option-AAPL").click();
  await page.getByTestId("watchlist-row-AAPL").click();
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
                  prev_close: 185,
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

test.describe("PBI-016 advanced orders", () => {
  test.describe.configure({ timeout: 60_000 });
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `adv-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("TC-016-01 bracket → force through TP → TP filled, SL cancelled @TC-016-01", async ({
    page,
  }) => {
    await page.goto("/workspace");
    await expect(page.getByTestId("panel-orderTicket")).toBeVisible();
    await expect(page.getByTestId("panel-blotter")).toBeVisible();
    await addAaplAndForceLast(page, 200);
    await page.getByTestId("order-tab-bracket").click();
    await page.getByTestId("order-qty").fill("2");
    await page.getByTestId("order-tp-offset").fill("5");
    await page.getByTestId("order-sl-offset").fill("5");
    await expect(page.getByTestId("order-tp-live")).toContainText("205.00");
    await expect(page.getByTestId("order-submit")).toBeEnabled();
    await page.getByTestId("order-submit").click();
    await page.getByTestId("order-confirm-submit").click();
    await applyStubTicks(page, [
      { last: 200, symbol: "AAPL", instrument_id: STUB_AAPL_INSTRUMENT_ID },
    ]);
    await expect(page.getByTestId("blotter-leg-entry")).toHaveAttribute("data-status", "filled", {
      timeout: 8_000,
    });
    await addAaplAndForceLast(page, 210);
    await applyStubTicks(page, [
      { last: 210, symbol: "AAPL", instrument_id: STUB_AAPL_INSTRUMENT_ID },
    ]);
    await expect(page.getByTestId("blotter-status-take_profit")).toHaveText("filled", {
      timeout: 8_000,
    });
    await expect(page.getByTestId("blotter-status-stop_loss")).toHaveText("cancelled");
  });
});
