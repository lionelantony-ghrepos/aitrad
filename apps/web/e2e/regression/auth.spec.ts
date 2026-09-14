import { expect, test } from "@playwright/test";
import { paperAccountSeed } from "@meridian/rules-engine";
import { formatPaperCash } from "../../lib/format-cash";
import { signUpThroughWizard } from "../helpers/onboard";

test.describe("P0 auth + provisioning @P0", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("/api/e2e/reset");
  });

  test("signup wizard provisions a paper account once @TC-004-01 @P0", async ({ page }) => {
    const email = `p0-auth-${Date.now()}@example.com`;
    const password = "test-pass-1";
    await signUpThroughWizard(page, email, password);
    await page.getByTestId("user-menu-trigger").click();
    const seed = paperAccountSeed();
    await expect(page.getByTestId("paper-cash")).toHaveText(
      formatPaperCash(seed.cashBalance, seed.currency),
    );
    await expect(page.getByTestId("account-count")).toHaveText("1");
    await page.getByTestId("logout").click();
    await expect(page.getByTestId("credentials-form")).toBeVisible();
    await page.getByTestId("email").fill(email);
    await page.getByTestId("password").fill(password);
    await page.getByTestId("auth-submit").click();
    await expect(page.getByTestId("workspace")).toBeVisible();
    await expect(page.getByTestId("account-count")).toHaveText("1");
  });

  test("logged-out workspace redirects; session survives reload @TC-004-02 @P0", async ({
    page,
  }) => {
    await page.goto("/workspace");
    await expect(page).toHaveURL(/\/login/);
    await signUpThroughWizard(page, `p0-guard-${Date.now()}@example.com`);
    await page.reload();
    await expect(page.getByTestId("workspace")).toBeVisible();
    await expect(page).toHaveURL(/\/workspace/);
  });
});
