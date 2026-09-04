import { expect, test } from "@playwright/test";
import { STUB_AAPL_INSTRUMENT_ID, STUB_MSFT_INSTRUMENT_ID } from "../lib/auth/stub-store";
import { TEST_TICK_BATCH_EVENT } from "../lib/quotes/transport";
import { signUpThroughWizard } from "./helpers/onboard";

test.describe("PBI-007 watchlist & quotes", () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `wl-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("TC-007-01 create list, add AAPL twice → one row + friendly error @TC-007-01", async ({
    page,
  }) => {
    await page.goto("/workspace");
    await expect(page.getByTestId("panel-watchlist")).toBeVisible();
    await page.getByTestId("watchlist-name").fill("Core");
    await page.getByTestId("watchlist-create").click();
    await expect(page.getByTestId("watchlist-tab-Core")).toBeVisible();

    await page.getByTestId("watchlist-search").fill("AAPL");
    await page.getByTestId("instrument-option-AAPL").click();
    await expect(page.getByTestId("watchlist-row-AAPL")).toBeVisible();

    await page.getByTestId("watchlist-search").fill("AAPL");
    await page.getByTestId("instrument-option-AAPL").click();
    await expect(page.getByTestId("watchlist-error")).toHaveText("AAPL is already on this list");
    await expect(page.getByTestId("watchlist-row-AAPL")).toHaveCount(1);
  });

  test("TC-007-02 force price change → row value + flash @TC-007-02", async ({ page }) => {
    await page.goto("/workspace");
    await page.getByTestId("watchlist-name").fill("Live");
    await page.getByTestId("watchlist-create").click();
    await page.getByTestId("watchlist-search").fill("AAPL");
    await page.getByTestId("instrument-option-AAPL").click();
    await expect(page.getByTestId("watchlist-row-AAPL")).toBeVisible();

    await page.evaluate(
      ({ eventName, instrumentId }) => {
        window.dispatchEvent(
          new CustomEvent(eventName, {
            detail: {
              ts: new Date().toISOString(),
              ticks: [
                {
                  instrument_id: instrumentId,
                  symbol: "AAPL",
                  bid: 199.9,
                  ask: 200.1,
                  last: 200,
                  prev_close: 185,
                  volume: 2,
                  ts: new Date().toISOString(),
                },
              ],
            },
          }),
        );
      },
      { eventName: TEST_TICK_BATCH_EVENT, instrumentId: STUB_AAPL_INSTRUMENT_ID },
    );

    await expect(page.getByTestId("watchlist-last-AAPL")).toHaveText("200.00", { timeout: 5_000 });
    await expect(page.getByTestId("watchlist-last-AAPL")).toHaveAttribute("data-flash", "up");
  });

  test("TC-007-03 click MSFT row → context readout = MSFT @TC-007-03", async ({ page }) => {
    await page.goto("/workspace");
    await page.getByTestId("watchlist-name").fill("Peers");
    await page.getByTestId("watchlist-create").click();
    await page.getByTestId("watchlist-search").fill("MSFT");
    await page.getByTestId("instrument-option-MSFT").click();
    await expect(page.getByTestId("watchlist-row-MSFT")).toBeVisible();
    await expect(page.getByTestId("watchlist-row-MSFT")).toHaveAttribute(
      "data-instrument-id",
      STUB_MSFT_INSTRUMENT_ID,
    );
    await page.getByTestId("watchlist-row-MSFT").click();
    await expect(page.getByTestId("symbol-context-readout")).toHaveText("MSFT");
  });
});
