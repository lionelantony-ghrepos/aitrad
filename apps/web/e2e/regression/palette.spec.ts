import { expect, test } from "@playwright/test";
import { signUpThroughWizard } from "../helpers/onboard";
import { runPalette } from "../helpers/palette";

test.describe("P0 command palette @P0", () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `p0-pal-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("DES NVDA, NEWS TSLA, AI hello route correctly @TC-009-02 @P0", async ({ page }) => {
    await runPalette(page, "DES NVDA");
    await expect(page.getByTestId("panel-des")).toBeVisible();
    await expect(page.getByTestId("des-symbol")).toHaveText("NVDA");
    await expect(page.getByTestId("symbol-context-readout")).toHaveText("NVDA");

    await runPalette(page, "NEWS TSLA");
    await expect(page.getByTestId("panel-news")).toBeVisible();
    await expect(page.getByTestId("news-symbol")).toHaveText("TSLA");

    await runPalette(page, "AI hello");
    await expect(page.getByTestId("panel-copilot")).toBeVisible();
    await expect(page.getByTestId("copilot-input")).toHaveValue("hello");
  });
});
