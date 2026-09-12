import { expect, test } from "@playwright/test";
import { signUpThroughWizard } from "./helpers/onboard";

test.describe("PBI-021 screener", () => {
  test.setTimeout(60_000);
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `scr-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("save, reload, run round-trips and add to watchlist @TC-021-03", async ({ page }) => {
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
    await expect(page.getByTestId("screener-row-NVDA")).toHaveCount(0);

    await page.getByTestId("screener-name").fill("Div yield");
    await page.getByTestId("screener-save").click();
    await expect(page.getByText("Screen saved.")).toBeVisible();

    await value.fill("9");
    await page.getByTestId("screener-run").click();
    await expect(page.getByTestId("screener-empty")).toBeVisible();

    const load = page.getByTestId("screener-load");
    const optionValue = await load
      .locator("option", { hasText: "Div yield" })
      .first()
      .getAttribute("value");
    await load.selectOption(optionValue ?? "");
    await expect(page.getByTestId("screener-value").first()).toHaveValue("1");
    await page.getByTestId("screener-run").click();
    await expect(page.getByTestId("screener-row-AAPL")).toBeVisible();
    await expect(page.getByTestId("screener-row-MSFT")).toBeVisible();

    await page.getByTestId("screener-row-AAPL").click();
    await expect(page.getByTestId("symbol-context-readout")).toHaveText("AAPL");

    await page.getByTestId("watchlist-name").fill("From SCR");
    await page.getByTestId("watchlist-create").click();
    await expect(page.getByTestId("watchlist-tab-From SCR")).toBeVisible();
    const watchlistSelect = page.getByTestId("screener-watchlist");
    await watchlistSelect.focus();
    await expect(watchlistSelect.locator("option", { hasText: "From SCR" })).toHaveCount(1, {
      timeout: 10_000,
    });
    await watchlistSelect.selectOption({ label: "From SCR" });
    await page.getByTestId("screener-add-watchlist").click();
    await expect(page.getByText(/Added 2 symbols/)).toBeVisible();
    await expect(page.getByTestId("watchlist-row-AAPL")).toBeVisible();
    await expect(page.getByTestId("watchlist-row-MSFT")).toBeVisible();
  });
});
