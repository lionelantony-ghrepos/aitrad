import { expect, test } from "@playwright/test";
import { STUB_AAPL_INSTRUMENT_ID, STUB_MSFT_INSTRUMENT_ID } from "../../lib/auth/stub-store";
import { TEST_TICK_BATCH_EVENT } from "../../lib/quotes/transport";
import { signUpThroughWizard } from "../helpers/onboard";

test.describe("P0 watchlist, chart, palette @P0", () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `p0-wl-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("create list, add AAPL twice @TC-007-01 @P0", async ({ page }) => {
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

  test("force price change flashes last @TC-007-02 @P0", async ({ page }) => {
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

  test("click MSFT sets symbolContext @TC-007-03 @P0", async ({ page }) => {
    await page.goto("/workspace");
    await page.getByTestId("watchlist-name").fill("Peers");
    await page.getByTestId("watchlist-create").click();
    await page.getByTestId("watchlist-search").fill("MSFT");
    await page.getByTestId("instrument-option-MSFT").click();
    await expect(page.getByTestId("watchlist-row-MSFT")).toHaveAttribute(
      "data-instrument-id",
      STUB_MSFT_INSTRUMENT_ID,
    );
    await page.getByTestId("watchlist-row-MSFT").click();
    await expect(page.getByTestId("symbol-context-readout")).toHaveText("MSFT");
  });

  test("chart ranges use 1m on 1D @TC-008-01 @P0", async ({ page }) => {
    await page.goto("/workspace");
    await expect(page.getByTestId("panel-chart")).toBeVisible();
    await page.getByTestId("watchlist-name").fill("Chart");
    await page.getByTestId("watchlist-create").click();
    await page.getByTestId("watchlist-search").fill("MSFT");
    await page.getByTestId("instrument-option-MSFT").click();
    await page.getByTestId("watchlist-row-MSFT").click();
    await expect(page.getByTestId("chart-symbol")).toHaveText("MSFT");
    await expect(page.getByTestId("panel-chart")).toHaveAttribute("data-timeframe", "1m");
    for (const range of ["1W", "1M", "1Y", "5Y"] as const) {
      await page.getByTestId(`chart-range-${range}`).click();
      await expect(page.getByTestId("panel-chart")).toHaveAttribute("data-range", range);
      await expect(page.getByTestId("panel-chart")).toHaveAttribute("data-timeframe", "1d");
    }
    await page.getByTestId("chart-range-1D").click();
    await expect(page.getByTestId("panel-chart")).toHaveAttribute("data-timeframe", "1m");
  });
});
