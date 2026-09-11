import { expect, type Page } from "@playwright/test";

/** Dock API is up and the command bar can accept Ctrl+K / the palette button. */
export async function waitForWorkspaceReady(page: Page, timeout = 20_000): Promise<void> {
  const workspace = page.getByTestId("workspace");
  await expect(workspace).toBeVisible({ timeout });
  await expect(workspace).toHaveAttribute("data-ready", "1", { timeout });
  await expect(page.getByTestId("command-bar")).toBeVisible();
  await expect(page.getByTestId("open-palette")).toBeVisible();
}

/**
 * Open the command palette after the workspace is interactive.
 * Prefers Ctrl+K on a focused workspace; falls back to the command-bar button
 * so a leftover navigation wait cannot eat the whole test timeout.
 */
export async function runPalette(page: Page, command: string): Promise<void> {
  await waitForWorkspaceReady(page);
  const palette = page.getByTestId("command-palette");
  if (!(await palette.isVisible())) {
    await page.getByTestId("command-bar").click({ position: { x: 12, y: 4 } });
    try {
      await page.getByTestId("workspace").press("Control+K", { timeout: 8_000 });
      await expect(palette).toBeVisible({ timeout: 3_000 });
    } catch {
      await page.getByTestId("open-palette").click();
      await expect(palette).toBeVisible();
    }
  }
  await page.getByTestId("palette-input").fill(command);
  await page.getByTestId("palette-input").press("Enter");
}
