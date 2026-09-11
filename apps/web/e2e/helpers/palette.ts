import { expect, type Page } from "@playwright/test";

/** Dock API is up and the command bar can accept the palette chord / button. */
export async function waitForWorkspaceReady(page: Page, timeout = 20_000): Promise<void> {
  const workspace = page.getByTestId("workspace");
  await expect(workspace).toBeVisible({ timeout });
  await expect(workspace).toHaveAttribute("data-ready", "1", { timeout });
  await expect(page.getByTestId("command-bar")).toBeVisible();
  await expect(page.getByTestId("open-palette")).toBeVisible();
}

/**
 * Fire the same window keydown the shell listens for.
 * Do not use Playwright `press("Control+K")` — Chromium treats that chord as
 * a browser shortcut and elementHandle.press can hang until the test timeout.
 */
export async function dispatchPaletteHotkey(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        code: "KeyK",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}

export async function openCommandPalette(page: Page): Promise<void> {
  await waitForWorkspaceReady(page);
  const palette = page.getByTestId("command-palette");
  if (await palette.isVisible()) {
    return;
  }
  await dispatchPaletteHotkey(page);
  try {
    await expect(palette).toBeVisible({ timeout: 2_000 });
  } catch {
    await page.getByTestId("open-palette").click();
    await expect(palette).toBeVisible();
  }
}

export async function runPalette(page: Page, command: string): Promise<void> {
  await openCommandPalette(page);
  await page.getByTestId("palette-input").fill(command);
  await page.getByTestId("palette-input").press("Enter");
}
