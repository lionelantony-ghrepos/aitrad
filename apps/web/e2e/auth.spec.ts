import { expect, test } from "@playwright/test";
import { paperAccountSeed } from "@meridian/rules-engine";
import { formatPaperCash } from "../lib/format-cash";
import { signUpThroughWizard } from "./helpers/onboard";

test.describe("PBI-004 auth & profiles", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("/api/e2e/reset");
  });

  test("TC-004-01 signup wizard workspace provisions once @TC-004-01", async ({ page }) => {
    const email = `ada-${Date.now()}@example.com`;
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
    await page.getByTestId("user-menu-trigger").click();
    await expect(page.getByTestId("paper-cash")).toHaveText(
      formatPaperCash(seed.cashBalance, seed.currency),
    );
  });

  test("TC-004-02 workspace guard and session reload @TC-004-02", async ({ page }) => {
    await page.goto("/workspace");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId("credentials-form")).toBeVisible();

    await signUpThroughWizard(page, `guard-${Date.now()}@example.com`);
    await page.reload();
    await expect(page.getByTestId("workspace")).toBeVisible();
    await expect(page).toHaveURL(/\/workspace/);
  });

  test("TC-004-03 Google OAuth stub completes @TC-004-03", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("oauth-google").click();
    await expect(page.getByTestId("wizard-form")).toBeVisible();
    await page.getByTestId("display-name").fill("OAuth User");
    await page.getByTestId("wizard-submit").click();
    await expect(page.getByTestId("workspace")).toBeVisible();
  });
});
