import { expect, type Page } from "@playwright/test";

/**
 * Shared command-palette automation (e2e, P0 regression, live/OBS capture).
 *
 * Do **not** call Playwright `locator.fill()` (or `press("Control+K")`) on the
 * cmdk input. Chromium treats Control+K as a browser shortcut, and `fill` waits
 * for a React-controlled cmdk value to match — both hang until the test timeout.
 *
 * QA demo capture after `demo.trader` login → `/workspace`:
 *
 * ```ts
 * import { runPalette } from "../helpers/palette";
 * // default: wait for dock + JS idle → hotkey open → type query → select item
 * await runPalette(page, "GIP MSFT");
 * await runPalette(page, "ORD");
 * // visible typing for OBS:
 * await runPalette(page, "NEWS TSLA", { typeDelayMs: 40 });
 * // dock `data-ready` never flips (provision residual):
 * await runPalette(page, "DES NVDA", { requireDock: false });
 * ```
 *
 * Do not click the Ctrl+K button or `fill` the input from Playwright.
 */

export type PaletteOptions = {
  /**
   * Wait for dock `data-ready=1`. Default true for e2e (panel focus needs the
   * dock API). Set false for live capture when provision leaves data-ready=0.
   */
  requireDock?: boolean;
  /** When > 0, type via `keyboard.type` so the query is visible on camera. */
  typeDelayMs?: number;
};

/** Command bar is up; palette chord / Ctrl+K button can run. */
export async function waitForCommandBar(page: Page, timeout = 20_000): Promise<void> {
  await expect(page.getByTestId("workspace")).toBeVisible({ timeout });
  await expect(page.getByTestId("command-bar")).toBeVisible({ timeout });
  await expect(page.getByTestId("open-palette")).toBeVisible({ timeout });
}

/** Dock API is up (`data-ready=1`). Not the same as paper-account provision. */
export async function waitForDockReady(page: Page, timeout = 20_000): Promise<void> {
  await expect(page.getByTestId("workspace")).toHaveAttribute("data-ready", "1", { timeout });
}

/**
 * Dockview + lightweight-charts can block JS after `data-ready=1`.
 * `waitForFunction(() => true)` only returns once the page can run script;
 * clicks and hotkey dispatch hang until then.
 */
export async function waitForMainThread(page: Page, timeout = 15_000): Promise<void> {
  await page.waitForFunction(() => true, undefined, { timeout });
}

/** Dock API is up and the command bar can accept the palette chord / button. */
export async function waitForWorkspaceReady(page: Page, timeout = 20_000): Promise<void> {
  await waitForCommandBar(page, timeout);
  await waitForDockReady(page, timeout);
  await waitForMainThread(page, timeout);
}

/**
 * Fire the same window keydown the shell listens for.
 * Do not use Playwright `press("Control+K")` — Chromium treats that chord as
 * a browser shortcut and elementHandle.press can hang until the test timeout.
 *
 * `waitForFunction` (not `page.evaluate`) so a busy dockview main thread cannot
 * hang past the explicit timeout.
 */
export async function dispatchPaletteHotkey(page: Page): Promise<void> {
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
    { timeout: 10_000 },
  );
}

export async function openCommandPalette(page: Page, options: PaletteOptions = {}): Promise<void> {
  const requireDock = options.requireDock !== false;
  await waitForCommandBar(page);
  if (requireDock) {
    await waitForDockReady(page);
  }
  await waitForMainThread(page);
  const palette = page.getByTestId("command-palette");
  const input = page.getByTestId("palette-input");
  // Never click `open-palette` — Playwright click waits for the page to handle
  // the mouse event and hangs while dockview/charts occupy the main thread.
  await expect
    .poll(
      async () => {
        if (await palette.isVisible().catch(() => false)) {
          return true;
        }
        try {
          await dispatchPaletteHotkey(page);
        } catch {
          await waitForMainThread(page, 5_000);
        }
        return palette.isVisible().catch(() => false);
      },
      { timeout: 15_000, intervals: [100, 250, 500] },
    )
    .toBe(true);
  await expect(input).toBeVisible({ timeout: 5_000 });
  await expect(palette).toHaveAttribute("data-settled", "1", { timeout: 5_000 });
}

async function focusPaletteInput(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="palette-input"]');
      if (!(el instanceof HTMLInputElement)) {
        return false;
      }
      el.focus();
      el.select();
      return document.activeElement === el;
    },
    undefined,
    { timeout: 3_000 },
  );
}

/**
 * Set the cmdk query without Playwright `fill`.
 * Real key events (not a polling native-setter) so React/cmdk update once.
 * Confirms React state via `data-query` (DOM value alone can lie).
 */
export async function setPaletteQuery(
  page: Page,
  command: string,
  options: PaletteOptions = {},
): Promise<void> {
  const palette = page.getByTestId("command-palette");
  await expect(page.getByTestId("palette-input")).toBeVisible();
  await expect(palette).toHaveAttribute("data-settled", "1");
  await focusPaletteInput(page);
  await page.keyboard.type(command, { delay: options.typeDelayMs ?? 0 });
  await expect(palette).toHaveAttribute("data-query", command, { timeout: 5_000 });
}

/** Activate the first matching palette row, then Enter as fallback. */
export async function selectPaletteItem(page: Page): Promise<void> {
  await expect(page.getByTestId("palette-item").first()).toBeVisible({ timeout: 5_000 });
  try {
    await page.waitForFunction(
      () => {
        const item = document.querySelector('[data-testid="palette-item"]');
        if (!(item instanceof HTMLElement)) {
          return false;
        }
        item.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        return true;
      },
      undefined,
      { timeout: 3_000 },
    );
  } catch {
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="palette-input"]');
        if (!(el instanceof HTMLInputElement)) {
          return false;
        }
        el.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
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
}

export async function runPalette(
  page: Page,
  command: string,
  options: PaletteOptions = {},
): Promise<void> {
  await openCommandPalette(page, options);
  await setPaletteQuery(page, command, options);
  await selectPaletteItem(page);
}
