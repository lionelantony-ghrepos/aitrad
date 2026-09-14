import { expect, test } from "@playwright/test";
import { signUpThroughWizard } from "../helpers/onboard";
import { dispatchPaletteHotkey, waitForWorkspaceReady } from "../helpers/palette";

async function runFn(page: import("@playwright/test").Page, command: string): Promise<void> {
  await waitForWorkspaceReady(page);
  const palette = page.getByTestId("command-palette");
  if (!(await palette.isVisible().catch(() => false))) {
    await dispatchPaletteHotkey(page);
  }
  await expect(palette).toBeVisible();
  await page.evaluate((value) => {
    const el = document.querySelector('[data-testid="palette-input"]');
    if (!(el instanceof HTMLInputElement)) {
      throw new Error("PALETTE_INPUT_MISSING");
    }
    const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    proto?.set?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, command);
  await page.keyboard.press("Enter");
}

test.describe("P0 command palette @P0", () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `p0-pal-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("DES NVDA, NEWS TSLA, AI hello route correctly @TC-009-02 @P0", async ({ page }) => {
    await page.goto("/workspace");

    await runFn(page, "DES NVDA");
    await expect(page.getByTestId("panel-des")).toBeVisible();
    await expect(page.getByTestId("des-symbol")).toHaveText("NVDA");
    await expect(page.getByTestId("symbol-context-readout")).toHaveText("NVDA");

    await runFn(page, "NEWS TSLA");
    await expect(page.getByTestId("panel-news")).toBeVisible();
    await expect(page.getByTestId("news-symbol")).toHaveText("TSLA");

    await runFn(page, "AI hello");
    await expect(page.getByTestId("panel-copilot")).toBeVisible();
    await expect(page.getByTestId("copilot-input")).toHaveValue("hello");
  });
});
