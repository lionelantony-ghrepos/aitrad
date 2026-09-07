import { expect, test } from "@playwright/test";
import { signUpThroughWizard } from "./helpers/onboard";
import { setStubPersona } from "./helpers/persona";

test.describe("PBI-012 rules admin", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("/api/e2e/reset");
  });

  test("TC-012-01 edit DT-RISK-01 draft, simulate, publish, evaluate @TC-012-01", async ({
    page,
  }) => {
    await signUpThroughWizard(page, `admin-${Date.now()}@example.com`);
    await setStubPersona(page, "admin");
    await page.goto("/admin/rules");
    await expect(page.getByTestId("rules-admin")).toBeVisible();
    await page.getByTestId("table-DT-RISK-01").click();
    const cell = page.getByTestId("cell-2-order_notional");
    await expect(cell).toBeVisible();
    await cell.fill("1000");
    await page.getByTestId("save-draft").click();
    await page.getByTestId("tab-simulate").click();
    await page.getByTestId("simulate-run").click();
    await expect(page.getByTestId("simulate-agreement")).toContainText("agreement");
    await page.getByTestId("publish").click();
    await expect(page.getByTestId("published-version")).toHaveText("v2");
    await page.getByTestId("probe-notional").fill("2000");
    await page.getByTestId("probe-evaluate").click();
    await expect(page.getByTestId("probe-outcome")).toContainText("RISK_MAX_NOTIONAL");
  });

  test("TC-012-02 trader is denied rules admin @TC-012-02", async ({ page }) => {
    await signUpThroughWizard(page, `trader-${Date.now()}@example.com`);
    await setStubPersona(page, "trader");
    await page.goto("/admin/rules");
    await expect(page.getByTestId("rules-denied")).toBeVisible();
    await expect(page.getByTestId("rules-admin")).toHaveCount(0);
  });
});
