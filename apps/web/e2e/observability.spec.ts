import { expect, test } from "@playwright/test";
import { CRASH_PANEL_STORAGE_KEY } from "../components/workspace/panel-error-boundary";
import { signUpThroughWizard } from "./helpers/onboard";
import { setStubPersona } from "./helpers/persona";

test.describe("PBI-030 observability", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("/api/e2e/reset");
  });

  test("TC-030-01 throw in panel hook isolates crash and reports @TC-030-01", async ({ page }) => {
    await signUpThroughWizard(page, `obs-${Date.now()}@example.com`);
    await page.evaluate((key) => localStorage.setItem(key, "watchlist"), CRASH_PANEL_STORAGE_KEY);
    await page.reload();
    await expect(page.getByTestId("panel-watchlist-error")).toBeVisible();
    await expect(page.getByTestId("panel-chart")).toBeVisible();
    await expect(page.getByTestId("panel-error-reported")).toBeVisible();
    await expect(page.getByTestId("workspace")).toBeVisible();
  });

  test("TC-030-02 workspace interactive timing stays under CI TTI budget @TC-030-02", async ({
    page,
  }) => {
    await signUpThroughWizard(page, `tti-${Date.now()}@example.com`);
    await page.goto("/workspace");
    await expect(page.getByTestId("workspace")).toBeVisible();
    const interactive = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined;
      return nav?.domInteractive ?? Number.POSITIVE_INFINITY;
    });
    expect(interactive).toBeLessThan(3000);
  });

  test("admin health dashboard loads @TC-030-01", async ({ page }) => {
    await signUpThroughWizard(page, `health-${Date.now()}@example.com`);
    await page.request.post("/telemetry", {
      data: { op: "realtime", state: "live" },
    });
    await setStubPersona(page, "admin");
    await page.goto("/admin/health");
    await expect(
      page.getByTestId("health-dashboard").or(page.getByTestId("health-empty")),
    ).toBeVisible();
  });

  test("trader is denied health admin", async ({ page }) => {
    await signUpThroughWizard(page, `health-trader-${Date.now()}@example.com`);
    await setStubPersona(page, "trader");
    await page.goto("/admin/health");
    await expect(page.getByTestId("health-denied")).toBeVisible();
  });
});
