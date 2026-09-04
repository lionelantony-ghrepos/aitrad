import { expect, test } from "@playwright/test";
import { STUB_AAPL_INSTRUMENT_ID } from "../lib/auth/stub-store";
import { TEST_TICK_BATCH_EVENT } from "../lib/quotes/transport";
import { signUpThroughWizard } from "./helpers/onboard";

async function addWatchlistSymbols(page: import("@playwright/test").Page, symbols: string[]) {
  await page.getByTestId("watchlist-name").fill("Chart");
  await page.getByTestId("watchlist-create").click();
  await expect(page.getByTestId("watchlist-tab-Chart")).toBeVisible();
  for (const symbol of symbols) {
    await page.getByTestId("watchlist-search").fill(symbol);
    await page.getByTestId(`instrument-option-${symbol}`).click();
    await expect(page.getByTestId(`watchlist-row-${symbol}`)).toBeVisible();
  }
}

test.describe("PBI-008 chart panel", () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `chart-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("TC-008-01 watchlist MSFT then cycle ranges uses 1m on 1D @TC-008-01", async ({ page }) => {
    await page.goto("/workspace");
    await expect(page.getByTestId("panel-chart")).toBeVisible();
    await addWatchlistSymbols(page, ["MSFT"]);
    await page.getByTestId("watchlist-row-MSFT").click();
    await expect(page.getByTestId("chart-symbol")).toHaveText("MSFT");
    await expect(page.getByTestId("panel-chart")).toHaveAttribute("data-timeframe", "1m");
    await expect(page.getByTestId("chart-legend")).not.toHaveText("—");
    await expect(page.getByTestId("chart-error")).toHaveCount(0);

    for (const range of ["1W", "1M", "1Y", "5Y"] as const) {
      await page.getByTestId(`chart-range-${range}`).click();
      await expect(page.getByTestId("panel-chart")).toHaveAttribute("data-range", range);
      await expect(page.getByTestId("panel-chart")).toHaveAttribute("data-timeframe", "1d");
      await expect(page.getByTestId("chart-error")).toHaveCount(0);
    }

    await page.getByTestId("chart-range-1D").click();
    await expect(page.getByTestId("panel-chart")).toHaveAttribute("data-timeframe", "1m");
  });

  test("TC-008-03 force tick updates last candle close @TC-008-03", async ({ page }) => {
    await page.goto("/workspace");
    await addWatchlistSymbols(page, ["AAPL"]);
    await page.getByTestId("watchlist-row-AAPL").click();
    await expect(page.getByTestId("chart-symbol")).toHaveText("AAPL");
    await expect(page.getByTestId("panel-chart")).toHaveAttribute("data-last-close", /\d+\.\d{2}/);

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

    await expect(page.getByTestId("panel-chart")).toHaveAttribute("data-last-close", "200.00", {
      timeout: 5_000,
    });
  });

  test("TC-008-04 rapid symbol switch keeps the final symbol @TC-008-04", async ({ page }) => {
    await page.goto("/workspace");
    await addWatchlistSymbols(page, ["AAPL", "MSFT"]);
    await page.getByTestId("watchlist-row-AAPL").click();
    await page.getByTestId("watchlist-row-MSFT").click();
    await page.getByTestId("watchlist-row-AAPL").click();
    await page.getByTestId("watchlist-row-MSFT").click();
    await page.getByTestId("watchlist-row-AAPL").click();
    await expect(page.getByTestId("chart-symbol")).toHaveText("AAPL");
    await expect(page.getByTestId("symbol-context-readout")).toHaveText("AAPL");
    await expect(page.getByTestId("chart-legend")).not.toHaveText("—");
  });

  test("toggle RSI pane from the indicator toolbar", async ({ page }) => {
    await page.goto("/workspace");
    await addWatchlistSymbols(page, ["MSFT"]);
    await page.getByTestId("watchlist-row-MSFT").click();
    await expect(page.getByTestId("panel-chart")).toHaveAttribute("data-rsi", "off");
    await page.getByTestId("chart-indicator-rsi14").click();
    await expect(page.getByTestId("panel-chart")).toHaveAttribute("data-rsi", "on");
    await expect(page.getByTestId("chart-canvas")).toHaveAttribute("data-rsi-pane", "on");
    await expect(page.getByTestId("chart-legend")).toContainText("RSI");
    await page.getByTestId("chart-indicator-rsi14").click();
    await expect(page.getByTestId("panel-chart")).toHaveAttribute("data-rsi", "off");
  });
});
