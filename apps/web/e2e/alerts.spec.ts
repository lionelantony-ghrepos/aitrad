import { expect, test } from "@playwright/test";
import { STUB_AAPL_INSTRUMENT_ID } from "../lib/auth/stub-store";
import { TEST_TICK_BATCH_EVENT } from "../lib/quotes/transport";
import { signUpThroughWizard } from "./helpers/onboard";

async function driveAapl(page: import("@playwright/test").Page, last: number): Promise<void> {
  await page.evaluate(
    ({ eventName, instrumentId, last: px }) => {
      window.dispatchEvent(
        new CustomEvent(eventName, {
          detail: {
            ts: new Date().toISOString(),
            ticks: [
              {
                instrument_id: instrumentId,
                symbol: "AAPL",
                bid: px - 0.1,
                ask: px + 0.1,
                last: px,
                prev_close: 185,
                volume: 2,
                ts: new Date().toISOString(),
              },
            ],
          },
        }),
      );
    },
    { eventName: TEST_TICK_BATCH_EVENT, instrumentId: STUB_AAPL_INSTRUMENT_ID, last },
  );
}

test.describe("PBI-022 alerts", () => {
  test.setTimeout(60_000);
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `alrt-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("TC-022-01 create cross alert, force past → one toast and badge; second force still 1 @TC-022-01", async ({
    page,
  }) => {
    await page.goto("/workspace");
    await page.getByTestId("watchlist-pane-alerts").click();
    await expect(page.getByTestId("watchlist-alerts")).toBeVisible();
    await page.getByTestId("alert-create-symbol").fill("AAPL");
    await page.getByTestId("alert-create-kind").selectOption("price_cross_above");
    await page.getByTestId("alert-create-threshold").fill("200");
    await page.getByTestId("alert-create-submit").click();
    await expect(page.getByTestId("alert-rule-price_cross_above")).toBeVisible();

    await driveAapl(page, 201);
    await expect(page.getByTestId("alert-toast")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("alert-unread-badge")).toHaveText("1");

    await driveAapl(page, 199);
    await driveAapl(page, 210);
    await expect(page.getByTestId("alert-unread-badge")).toHaveText("1");
  });

  test("TC-022-02 disabled alert does not fire @TC-022-02", async ({ page }) => {
    await page.goto("/workspace");
    await page.getByTestId("watchlist-pane-alerts").click();
    await page.getByTestId("alert-create-symbol").fill("AAPL");
    await page.getByTestId("alert-create-kind").selectOption("price_cross_above");
    await page.getByTestId("alert-create-threshold").fill("200");
    await page.getByTestId("alert-create-submit").click();
    await expect(page.getByTestId("alert-rule-price_cross_above")).toBeVisible();
    await page.getByTestId("alert-toggle-price_cross_above").click();
    await expect(page.getByTestId("alert-rule-price_cross_above")).toHaveAttribute(
      "data-active",
      "0",
    );

    await driveAapl(page, 201);
    await expect(page.getByTestId("alert-unread-badge")).toHaveText("0");
    await expect(page.getByTestId("alert-toast")).toHaveCount(0);
  });
});
