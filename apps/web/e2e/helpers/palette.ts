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
  // waitForFunction has an explicit timeout; page.evaluate can hang until the
  // test timeout if the main thread is busy after dockview layout.
  await page.waitForFunction(
    () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "k",
          code: "KeyK",
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      return true;
    },
    undefined,
    { timeout: 3_000 },
  );
}

export async function openCommandPalette(page: Page): Promise<void> {
  await waitForWorkspaceReady(page);
  const palette = page.getByTestId("command-palette");
  const input = page.getByTestId("palette-input");
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (await palette.isVisible().catch(() => false)) {
      await expect(input).toBeVisible();
      return;
    }
    // Native Control+K is a Chromium shortcut. A normal click can hang after
    // "performing click action" on the command bar; force + hotkey fallback.
    try {
      await page.getByTestId("open-palette").click({
        force: true,
        timeout: 2_000,
        noWaitAfter: true,
      });
    } catch {
      try {
        await dispatchPaletteHotkey(page);
      } catch {
        /* main thread busy; retry */
      }
    }
  }
  await expect(palette).toBeVisible({ timeout: 5_000 });
  await expect(input).toBeVisible({ timeout: 5_000 });
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
