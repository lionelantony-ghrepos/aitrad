import { expect, test } from "@playwright/test";
import { signUpThroughWizard } from "./helpers/onboard";

async function runPalette(page: import("@playwright/test").Page, command: string) {
  await page.keyboard.press("Control+K");
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await page.getByTestId("palette-input").fill(command);
  await page.getByTestId("palette-input").click();
  await page.keyboard.press("Enter");
}

test.describe("PBI-025 copilot chat", () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `copilot-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("TC-025-01 summarize AAPL news returns citation chips @TC-025-01", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/workspace");
    await runPalette(page, "AI summarize AAPL news today");
    await expect(page.getByTestId("command-palette")).toHaveCount(0);
    await expect(page.getByTestId("panel-copilot")).toBeVisible();
    await expect(page.getByTestId("copilot-input")).toHaveValue("summarize AAPL news today");
    await page.getByTestId("copilot-send").click();
    await expect(page.getByTestId("copilot-citation").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("copilot-citation").first()).toHaveAttribute("data-kind", "news");
    await page.getByTestId("copilot-citation").first().hover();
    await page.getByTestId("copilot-citation").first().click();
    await expect(page.getByTestId("news-drawer")).toBeVisible();
  });
});
