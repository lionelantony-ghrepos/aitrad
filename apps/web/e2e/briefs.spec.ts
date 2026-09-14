import { expect, test } from "@playwright/test";
import { signUpThroughWizard } from "./helpers/onboard";
import { runPalette, waitForWorkspaceReady } from "./helpers/palette";

async function openBriefsTab(page: import("@playwright/test").Page): Promise<void> {
  if (
    !(await page
      .getByTestId("panel-copilot")
      .isVisible()
      .catch(() => false))
  ) {
    await runPalette(page, "AI briefs");
  }
  await expect(page.getByTestId("panel-copilot")).toBeVisible();
  await page.getByTestId("copilot-tab-briefs").click();
  await expect(page.getByTestId("copilot-briefs")).toBeVisible();
}

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
    await waitForWorkspaceReady(page);
    await openBriefsTab(page);

    await page.getByTestId("brief-generate-morning").click();
    await expect(page.getByTestId("brief-card-morning")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("brief-generate-portfolio").click();
    await expect(page.getByTestId("brief-card-portfolio")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("brief-generate-instrument").click();
    await expect(page.getByTestId("brief-card-instrument")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("brief-citation").first()).toBeVisible();

    await page.getByTestId("portfolio-generate-brief").click();
    await runPalette(page, "DES AAPL");
    await expect(page.getByTestId("des-generate-brief")).toBeVisible();
    await page.getByTestId("des-generate-brief").click();

    await openBriefsTab(page);
    const exportBtn = page.locator("[data-testid^='brief-export-']").first();
    await exportBtn.click();
    const pdfLink = page.locator("[data-testid^='brief-pdf-link-']").first();
    await expect(pdfLink).toBeVisible();
    await expect(pdfLink).toHaveAttribute("href", /^data:application\/pdf/);
  });
});
