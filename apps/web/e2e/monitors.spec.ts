import { expect, test } from "@playwright/test";
import { signUpThroughWizard } from "./helpers/onboard";
import { dispatchPaletteHotkey, waitForWorkspaceReady } from "./helpers/palette";

async function runMonitors(
  page: import("@playwright/test").Page,
  force_position_day_pct: number,
): Promise<{ fired?: number; error?: string }> {
  return page.evaluate(async (pct) => {
    const response = await fetch("/api/e2e/run-monitors", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force_position_day_pct: pct }),
    });
    return (await response.json()) as { fired?: number; error?: string };
  }, force_position_day_pct);
}

test.describe("PBI-027 monitors", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `mon-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("TC-027-02 portfolio-drop monitor fires once at forced -6% @TC-027-02", async ({ page }) => {
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
      await input.fill("AI tell me if any position drops 5% in a day", { force: true });
      await input.press("Enter");
    }
    await expect(page.getByTestId("panel-copilot")).toBeVisible();
    await page.getByTestId("copilot-input").fill("tell me if any position drops 5% in a day");
    await page.getByTestId("copilot-send").click();
    await expect(page.getByTestId("copilot-approval-card")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("copilot-tab-monitors").click();
    await expect(page.getByTestId("copilot-monitors")).toBeVisible();
    const row = page.locator("[data-testid^='monitor-row-']").first();
    await expect(row).toBeVisible();
    const monitorId = (await row.getAttribute("data-testid"))?.replace("monitor-row-", "") ?? "";
    await page.getByTestId(`monitor-explain-${monitorId}`).click();
    await expect(page.getByTestId(`monitor-explain-text-${monitorId}`)).toContainText("-5");

    const first = await runMonitors(page, -6);
    expect(first).toMatchObject({ fired: 1 });
    await page.getByTestId(`monitor-history-${monitorId}`).click();
    await expect(page.getByTestId("monitor-history-item")).toHaveCount(1);
    await expect(page.getByTestId("monitor-history-item")).toContainText("-6");

    const second = await runMonitors(page, -6);
    expect(second).toMatchObject({ fired: 0 });
    await page.getByTestId(`monitor-history-${monitorId}`).click();
    await expect(page.getByTestId("monitor-history-item")).toHaveCount(1);
  });

  test("TC-027-03 paused monitor stays silent @TC-027-03", async ({ page }) => {
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
      await input.fill("AI tell me if any position drops 5% in a day", { force: true });
      await input.press("Enter");
    }
    await expect(page.getByTestId("panel-copilot")).toBeVisible();
    await page.getByTestId("copilot-input").fill("tell me if any position drops 5% in a day");
    await page.getByTestId("copilot-send").click();
    await expect(page.getByTestId("copilot-approval-card")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("copilot-tab-monitors").click();
    const row = page.locator("[data-testid^='monitor-row-']").first();
    await expect(row).toBeVisible();
    const monitorId = (await row.getAttribute("data-testid"))?.replace("monitor-row-", "") ?? "";
    await page.getByTestId(`monitor-pause-${monitorId}`).click();
    await expect(row).toHaveAttribute("data-active", "0");
    const run = await runMonitors(page, -6);
    expect(run).toMatchObject({ fired: 0 });
    await page.getByTestId(`monitor-history-${monitorId}`).click();
    await expect(page.getByTestId("monitor-history-item")).toHaveCount(0);
  });
});
