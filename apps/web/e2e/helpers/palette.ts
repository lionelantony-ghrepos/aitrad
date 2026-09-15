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
  if (!(await palette.isVisible())) {
    // Native Control+K is a Chromium shortcut. A normal click can hang after
    // "performing click action" on the command bar; force + hotkey fallback.
    try {
      await page.getByTestId("open-palette").click({ force: true, timeout: 5_000 });
    } catch {
      await dispatchPaletteHotkey(page);
    }
  }
  if (!(await palette.isVisible().catch(() => false))) {
    await dispatchPaletteHotkey(page);
  }
  await expect(palette).toBeVisible();
  await expect(page.getByTestId("palette-input")).toBeVisible();
}

export async function runPalette(page: Page, command: string): Promise<void> {
  await openCommandPalette(page);
  const input = page.getByTestId("palette-input");
  try {
    await input.fill(command, { force: true, timeout: 4_000 });
  } catch {
    await page.evaluate((cmd) => {
      const el = document.querySelector('[data-testid="palette-input"]');
      if (!(el instanceof HTMLInputElement)) {
        throw new Error("palette-input missing");
      }
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(el, cmd);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, command);
  }
  try {
    await input.press("Enter", { timeout: 4_000 });
  } catch {
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="palette-input"]');
      el?.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
  }
}
