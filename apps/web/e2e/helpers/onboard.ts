import { expect, type Page } from "@playwright/test";

export async function signUpThroughWizard(
  page: Page,
  email: string,
  password = "test-pass-1",
): Promise<void> {
  await page.goto("/signup");
  await page.getByTestId("email").fill(email);
  await page.getByTestId("password").fill(password);
  await page.getByTestId("auth-submit").click();
  await expect(page.getByTestId("wizard-form")).toBeVisible();
  await page.getByTestId("display-name").fill("E2E Trader");
  await page.getByTestId("objectives").fill("learn the terminal");
  await page.getByTestId("wizard-submit").click();
  await expect(page.getByTestId("workspace")).toBeVisible();
}
