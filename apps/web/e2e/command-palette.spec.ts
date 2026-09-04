import { expect, test } from "@playwright/test";
import { signUpThroughWizard } from "./helpers/onboard";

async function runPalette(page: import("@playwright/test").Page, command: string) {
  await page.keyboard.press("Control+K");
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await page.getByTestId("palette-input").fill(command);
  await page.getByTestId("palette-input").press("Enter");
}

test.describe("PBI-009 command palette", () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `pal-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("TC-009-02 GIP MSFT focuses chart on MSFT @TC-009-02", async ({ page }) => {
    await page.goto("/workspace");
    await runPalette(page, "GIP MSFT");
    await expect(page.getByTestId("command-palette")).toHaveCount(0);
    await expect(page.getByTestId("symbol-context-readout")).toHaveText("MSFT");
    await expect(page.getByTestId("chart-symbol")).toHaveText("MSFT");
    await expect(page.getByTestId("focused-panel")).toHaveText("chart");
  });

  test("TC-009-02 DES NVDA, NEWS TSLA, AI hello route correctly @TC-009-02", async ({ page }) => {
    await page.goto("/workspace");

    await runPalette(page, "DES NVDA");
    await expect(page.getByTestId("panel-des")).toBeVisible();
    await expect(page.getByTestId("des-symbol")).toHaveText("NVDA");
    await expect(page.getByTestId("symbol-context-readout")).toHaveText("NVDA");
    await expect(page.getByTestId("focused-panel")).toHaveText("des");

    await runPalette(page, "NEWS TSLA");
    await expect(page.getByTestId("panel-news")).toBeVisible();
    await expect(page.getByTestId("news-symbol")).toHaveText("TSLA");
    await expect(page.getByTestId("symbol-context-readout")).toHaveText("TSLA");
    await expect(page.getByTestId("focused-panel")).toHaveText("news");

    await runPalette(page, "AI hello");
    await expect(page.getByTestId("panel-copilot")).toBeVisible();
    await expect(page.getByTestId("copilot-input")).toHaveValue("hello");
    await expect(page.getByTestId("focused-panel")).toHaveText("copilot");
  });
});
