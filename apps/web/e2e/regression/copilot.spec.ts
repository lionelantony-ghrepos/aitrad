import { expect, test } from "@playwright/test";
import { signUpThroughWizard } from "../helpers/onboard";
import { dispatchPaletteHotkey, waitForWorkspaceReady } from "../helpers/palette";

async function askCopilot(page: import("@playwright/test").Page, message: string): Promise<void> {
  await waitForWorkspaceReady(page);
  if (
    !(await page
      .getByTestId("panel-copilot")
      .isVisible()
      .catch(() => false))
  ) {
    await dispatchPaletteHotkey(page);
    await expect(page.getByTestId("command-palette")).toBeVisible();
    const input = page.getByTestId("palette-input");
    await input.fill(`AI ${message}`, { force: true });
    await input.press("Enter");
  }
  await expect(page.getByTestId("panel-copilot")).toBeVisible();
  await page.getByTestId("copilot-input").fill(message);
  await page.getByTestId("copilot-send").click();
}

async function runMonitors(
  page: import("@playwright/test").Page,
  force_position_day_pct: number,
): Promise<{ fired?: number }> {
  return page.evaluate(async (pct) => {
    const response = await fetch("/api/e2e/run-monitors", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force_position_day_pct: pct }),
    });
    return (await response.json()) as { fired?: number };
  }, force_position_day_pct);
}

test.describe("P0 copilot Q&A, order approval, monitor @P0", () => {
  test.describe.configure({ timeout: 90_000 });
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `p0-ai-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("summarize AAPL news cites sources @TC-025-01 @P0", async ({ page }) => {
    await askCopilot(page, "summarize AAPL news today");
    await expect(page.getByTestId("copilot-citation").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("copilot-citation").first()).toHaveAttribute("data-kind", "news");
    await page.getByTestId("copilot-citation").first().click();
    await expect(page.getByTestId("news-drawer")).toBeVisible();
  });

  test("buy 10 AAPL stays proposed until approve @TC-026-01 @P0", async ({ page }) => {
    await askCopilot(page, "buy 10 AAPL at market");
    const card = page.getByTestId("copilot-approval-card");
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card).toHaveAttribute("data-status", "proposed");
    await expect(page.locator("[data-testid^='blotter-row-'][data-symbol='AAPL']")).toHaveCount(0);
    await page.getByTestId("copilot-approve").click();
    await expect(card).toHaveAttribute("data-status", "executed");
    await expect(page.locator("[data-testid^='blotter-row-'][data-symbol='AAPL']")).toBeVisible({
      timeout: 8_000,
    });
  });

  test("portfolio-drop monitor fires once @TC-027-02 @P0", async ({ page }) => {
    await askCopilot(page, "tell me if any position drops 5% in a day");
    await expect(page.getByTestId("copilot-approval-card")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("copilot-tab-monitors").click();
    const row = page.locator("[data-testid^='monitor-row-']").first();
    await expect(row).toBeVisible();
    const first = await runMonitors(page, -6);
    expect(first).toMatchObject({ fired: 1 });
    const second = await runMonitors(page, -6);
    expect(second).toMatchObject({ fired: 0 });
  });
});
