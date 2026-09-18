import { expect, test } from "@playwright/test";
import { signUpThroughWizard } from "./helpers/onboard";
import { runPalette } from "./helpers/palette";

async function askCopilot(page: import("@playwright/test").Page, message: string): Promise<void> {
  if (
    !(await page
      .getByTestId("panel-copilot")
      .isVisible()
      .catch(() => false))
  ) {
    await runPalette(page, `AI ${message}`);
    await expect(page.getByTestId("command-palette")).toHaveCount(0);
  }
  await expect(page.getByTestId("panel-copilot")).toBeVisible();
  await page.getByTestId("copilot-input").fill(message);
  await page.getByTestId("copilot-send").click();
}

test.describe("PBI-026 copilot actions", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `copilot-act-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("TC-026-01 buy 10 AAPL proposes then approve fills blotter @TC-026-01", async ({ page }) => {
    await askCopilot(page, "buy 10 AAPL at market");
    const card = page.getByTestId("copilot-approval-card");
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card).toHaveAttribute("data-tool", "propose_order");
    await expect(card).toHaveAttribute("data-status", "proposed");
    await expect(page.locator("[data-testid^='blotter-row-'][data-symbol='AAPL']")).toHaveCount(0);
    await page.getByTestId("copilot-approve").click();
    await expect(card).toHaveAttribute("data-status", "executed");
    await expect(page.locator("[data-testid^='blotter-row-'][data-symbol='AAPL']")).toBeVisible({
      timeout: 8_000,
    });
  });

  test("TC-026-02 approve short sale is rejected by DT-RISK-01 @TC-026-02", async ({ page }) => {
    await askCopilot(page, "sell 10 AAPL at market");
    const card = page.getByTestId("copilot-approval-card");
    await expect(card).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("copilot-approve").click();
    await expect(card).toHaveAttribute("data-status", "executed");
    await expect(page.getByTestId("copilot-approval-status")).toContainText("RISK_NO_SHORTING");
  });

  test("TC-026-03 add NVDA to watchlist executes immediately @TC-026-03", async ({ page }) => {
    await askCopilot(page, "add NVDA to watchlist");
    await expect(page.getByTestId("copilot-approval-card")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("copilot-approval-card")).toHaveAttribute(
      "data-tool",
      "create_watchlist_item",
    );
    await expect(page.getByTestId("copilot-approval-card")).toHaveAttribute(
      "data-status",
      "executed",
    );
    await page.reload();
    const tab = page.getByTestId("watchlist-tab-Default");
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
    }
    await expect(page.getByTestId("watchlist-row-NVDA")).toBeVisible({ timeout: 15_000 });
  });
});
