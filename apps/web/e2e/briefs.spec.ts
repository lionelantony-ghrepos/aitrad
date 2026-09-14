import { expect, test } from "@playwright/test";
import { signUpThroughWizard } from "./helpers/onboard";
import { runPalette } from "./helpers/palette";

test.describe("PBI-028 briefs", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `brief-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("TC-028-01 generate three kinds and PDF export @TC-028-01", async ({ page }) => {
    await page.goto("/workspace");
    await expect(page.getByTestId("panel-copilot")).toBeVisible();
    await page.getByTestId("copilot-tab-briefs").click();
    await expect(page.getByTestId("copilot-briefs")).toBeVisible();

    await page.getByTestId("brief-generate-morning").click();
    await expect(page.getByTestId("brief-card-morning")).toBeVisible();

    await page.getByTestId("brief-generate-portfolio").click();
    await expect(page.getByTestId("brief-card-portfolio")).toBeVisible();

    await runPalette(page, "DES AAPL");
    await expect(page.getByTestId("panel-des")).toBeVisible();
    await page.getByTestId("des-generate-brief").click();
    await page.getByTestId("copilot-tab-briefs").click();
    await expect(page.getByTestId("brief-card-instrument")).toBeVisible();

    const exportBtn = page.locator("[data-testid^='brief-export-']").first();
    await exportBtn.click();
    await expect(page.getByTestId("brief-markdown").first()).toBeVisible();
  });
});
