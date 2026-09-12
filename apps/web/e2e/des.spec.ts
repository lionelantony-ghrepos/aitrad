import { expect, test } from "@playwright/test";
import { signUpThroughWizard } from "./helpers/onboard";
import { runPalette } from "./helpers/palette";

test.describe("PBI-020 DES fundamentals", () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `des-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("TC-020-01 DES NVDA renders stats @TC-020-01", async ({ page }) => {
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

  test("TC-020-02 peer strip click switches symbolContext @TC-020-02", async ({ page }) => {
    await page.goto("/workspace");
    await runPalette(page, "DES NVDA");
    await expect(page.getByTestId("des-peers")).toBeVisible();
    await page.getByTestId("des-peer-AAPL").click();
    await expect(page.getByTestId("symbol-context-readout")).toHaveText("AAPL");
    await expect(page.getByTestId("des-symbol")).toHaveText("AAPL");
    await expect(page.getByTestId("des-header")).toContainText("Apple");
  });
});
