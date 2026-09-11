import { expect, test } from "@playwright/test";
import { signUpThroughWizard } from "./helpers/onboard";
import { setStubPersona } from "./helpers/persona";

test.describe("PBI-024 users admin", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("/api/e2e/reset");
  });

  test("admin can list users and assign roles @TC-024-01", async ({ page }) => {
    await signUpThroughWizard(page, `admin-users-${Date.now()}@example.com`);
    await setStubPersona(page, "admin");
    await page.goto("/admin/users");
    await expect(page.getByTestId("user-row").first()).toBeVisible();
    await page.getByRole("button", { name: "compliance" }).first().click();
    await expect(page.getByTestId("user-row").first()).toContainText("compliance");
  });

  test("trader is denied users admin @TC-024-01", async ({ page }) => {
    await signUpThroughWizard(page, `trader-users-${Date.now()}@example.com`);
    await setStubPersona(page, "trader");
    await page.goto("/admin/users");
    await expect(page.getByTestId("users-denied")).toBeVisible();
  });
});
