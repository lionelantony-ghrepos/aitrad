import { expect, test } from "@playwright/test";
import { STUB_AAPL_INSTRUMENT_ID } from "../../lib/auth/stub-store";
import { signUpThroughWizard } from "../helpers/onboard";
import { runPalette } from "../helpers/palette";
import { dispatchLastTick } from "../helpers/ticks";

test.describe("P0 news, DES, alerts, screener @P0", () => {
  test.setTimeout(60_000);
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `p0-intel-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("NEWS TSLA shows only TSLA-tagged items @TC-019-01 @P0", async ({ page }) => {
    await page.goto("/workspace");
    await runPalette(page, "NEWS TSLA");
    await expect(page.getByTestId("panel-news")).toBeVisible();
    await expect(page.getByTestId("news-symbol")).toHaveText("TSLA");
    await expect(page.getByTestId("news-stream")).toBeVisible();
    const rows = page.locator("[data-testid^='news-row-']");
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const symbols = await rows.nth(i).getAttribute("data-symbols");
      expect(symbols?.split(",")).toContain("TSLA");
    }
    await expect(page.getByTestId("news-row-55555555-5555-4555-8555-555555555553")).toHaveCount(0);
    await rows.first().click();
    await expect(page.getByTestId("news-drawer")).toBeVisible();
    await expect(page.getByTestId("news-drawer-body")).not.toHaveText("");
  });

  test("DES NVDA renders stats @TC-020-01 @P0", async ({ page }) => {
    await page.goto("/workspace");
    await runPalette(page, "DES NVDA");
    await expect(page.getByTestId("panel-des")).toBeVisible();
    await expect(page.getByTestId("des-symbol")).toHaveText("NVDA");
    await expect(page.getByTestId("des-header")).toContainText("NVIDIA");
    await expect(page.getByTestId("des-stats")).toBeVisible();
    await expect(page.getByTestId("des-stat-pe")).toContainText("32.9");
    await expect(page.getByTestId("des-stat-eps")).toContainText("4.80");
    await expect(page.getByTestId("des-financials")).toBeVisible();
    await expect(page.getByTestId("des-analyst")).toBeVisible();
    await expect(page.getByTestId("des-range")).toBeVisible();
  });

  test("semantic search ranks the semis earnings fixture first @TC-023-02 @P0", async ({
    page,
  }) => {
    await page.goto("/workspace");
    await runPalette(page, "NEWS TSLA");
    await expect(page.getByTestId("panel-news")).toBeVisible();
    await page.getByTestId("news-all-markets").check();
    await page.getByTestId("news-semantic-input").fill("earnings beats in semis this week");
    await page.getByTestId("news-semantic-submit").click();
    await expect(page.getByTestId("news-search-results")).toBeVisible();
    const first = page.locator("[data-testid^='news-search-row-']").first();
    await expect(first).toHaveAttribute(
      "data-testid",
      "news-search-row-02302302-aaaa-4aaa-8aaa-000000000001",
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
