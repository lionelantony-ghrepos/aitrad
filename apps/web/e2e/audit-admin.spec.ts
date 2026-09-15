import { expect, test } from "@playwright/test";
import { signUpThroughWizard } from "./helpers/onboard";
import { setStubPersona } from "./helpers/persona";

test.describe("PBI-029 audit admin", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("/api/e2e/reset");
  });

  test("admin can browse and verify the audit log @TC-029-03", async ({ page }) => {
    await signUpThroughWizard(page, `admin-audit-${Date.now()}@example.com`);
    await setStubPersona(page, "admin");
    await page.goto("/admin/audit");
    await expect(page.getByTestId("audit-row").first()).toBeVisible();
    await expect(page.getByTestId("audit-retention")).toBeVisible();
    await page.getByRole("button", { name: "Verify chain" }).click();
    await expect(page.getByTestId("audit-chain")).toContainText("ok");
  });

  test("compliance can read audit but not set retention @TC-029-03", async ({ page }) => {
    await signUpThroughWizard(page, `compliance-audit-${Date.now()}@example.com`);
    await setStubPersona(page, "compliance");
    await page.goto("/admin/audit");
    await expect(page.getByTestId("audit-admin")).toBeVisible();
    await expect(page.getByTestId("audit-retention")).toHaveCount(0);
  });

  test("trader is denied audit admin @TC-029-03", async ({ page }) => {
    await signUpThroughWizard(page, `trader-audit-${Date.now()}@example.com`);
    await setStubPersona(page, "trader");
    await page.goto("/admin/audit");
    await expect(page.getByTestId("audit-denied")).toBeVisible();
  });
});
