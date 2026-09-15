import { expect, test } from "@playwright/test";
import { STUB_AAPL_INSTRUMENT_ID } from "../../lib/auth/stub-store";
import { signUpThroughWizard } from "../helpers/onboard";
import { dispatchLastTick } from "../helpers/ticks";

test.describe("P0 alerts + screener @P0", () => {
  test.setTimeout(60_000);
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `p0-intel-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("price-cross alert fires once @TC-022-01 @P0", async ({ page }) => {
    await page.goto("/workspace");
    await page.getByTestId("watchlist-pane-alerts").click();
    await expect(page.getByTestId("watchlist-alerts")).toBeVisible();
    await page.getByTestId("alert-create-symbol").fill("AAPL");
    await page.getByTestId("alert-create-kind").selectOption("price_cross_above");
    await page.getByTestId("alert-create-threshold").fill("200");
    await page.getByTestId("alert-create-submit").click();
    await expect(page.getByTestId("alert-rule-price_cross_above")).toBeVisible();
    await dispatchLastTick(page, {
      symbol: "AAPL",
      instrumentId: STUB_AAPL_INSTRUMENT_ID,
      last: 201,
      prevClose: 185,
    });
    await expect(page.getByTestId("alert-toast")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("alert-unread-badge")).toHaveText("1");
    await dispatchLastTick(page, {
      symbol: "AAPL",
      instrumentId: STUB_AAPL_INSTRUMENT_ID,
      last: 199,
      prevClose: 185,
    });
    await dispatchLastTick(page, {
      symbol: "AAPL",
      instrumentId: STUB_AAPL_INSTRUMENT_ID,
      last: 210,
      prevClose: 185,
    });
    await expect(page.getByTestId("alert-unread-badge")).toHaveText("1");
  });

  test("screener save and run round-trip @TC-021-03 @P0", async ({ page }) => {
    await expect(page.getByTestId("panel-screener")).toBeVisible();
    const field = page.getByTestId("screener-field").first();
    const op = page.getByTestId("screener-op").first();
    const value = page.getByTestId("screener-value").first();
    await field.selectOption("dividend_yield");
    await op.selectOption("gt");
    await value.fill("1");
    await page.getByTestId("screener-run").click();
    await expect(page.getByTestId("screener-row-AAPL")).toBeVisible();
    await expect(page.getByTestId("screener-row-MSFT")).toBeVisible();
    await page.getByTestId("screener-name").fill("P0 Div");
    await page.getByTestId("screener-save").click();
    await expect(page.getByText("Screen saved.")).toBeVisible();
    const load = page.getByTestId("screener-load");
    const optionValue = await load
      .locator("option", { hasText: "P0 Div" })
      .first()
      .getAttribute("value");
    await load.selectOption(optionValue ?? "");
    await expect(page.getByTestId("screener-value").first()).toHaveValue("1");
    await page.getByTestId("screener-run").click();
    await expect(page.getByTestId("screener-row-AAPL")).toBeVisible();
  });
});
