import { expect, test } from "@playwright/test";
import { signUpThroughWizard } from "./helpers/onboard";

async function runPalette(page: import("@playwright/test").Page, command: string) {
  await page.keyboard.press("Control+K");
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await page.getByTestId("palette-input").fill(command);
  await page.getByTestId("palette-input").press("Enter");
}

test.describe("PBI-019 news panel", () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `news-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("TC-019-01 NEWS TSLA shows only TSLA-tagged items @TC-019-01", async ({ page }) => {
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
});
