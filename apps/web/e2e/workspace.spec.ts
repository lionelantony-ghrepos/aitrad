import { expect, test } from "@playwright/test";
import { LAYOUT_STORAGE_KEY } from "../lib/layout-storage";
import { signUpThroughWizard } from "./helpers/onboard";

function layoutGrid(raw: string | null): unknown {
  if (raw === null) {
    return null;
  }
  const parsed = JSON.parse(raw) as { dockview?: { grid?: unknown } };
  return parsed.dockview?.grid ?? null;
}

test.describe("PBI-003 terminal shell", () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `ws-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("TC-003-01 resize then reload keeps layout @TC-003-01", async ({ page }) => {
    await page.goto("/workspace");
    await expect(page.getByTestId("workspace")).toBeVisible();
    await expect(page.getByTestId("panel-chart")).toBeVisible();

    await expect
      .poll(async () => page.evaluate((key) => localStorage.getItem(key), LAYOUT_STORAGE_KEY))
      .not.toBeNull();

    const sash = page.locator(".dv-sash.dv-enabled").first();
    await expect(sash).toBeVisible();
    const box = await sash.boundingBox();
    expect(box).not.toBeNull();
    if (!box) {
      throw new Error("sash bounding box missing");
    }

    const before = await page.evaluate((key) => localStorage.getItem(key), LAYOUT_STORAGE_KEY);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 40, { steps: 8 });
    await page.mouse.up();

    await expect
      .poll(async () => page.evaluate((key) => localStorage.getItem(key), LAYOUT_STORAGE_KEY))
      .not.toBe(before);

    const afterResize = await page.evaluate((key) => localStorage.getItem(key), LAYOUT_STORAGE_KEY);
    await page.reload();
    await expect(page.getByTestId("panel-chart")).toBeVisible();
    const afterReload = await page.evaluate((key) => localStorage.getItem(key), LAYOUT_STORAGE_KEY);
    expect(layoutGrid(afterReload)).toEqual(layoutGrid(afterResize));
  });

  test("TC-003-02 status bar shows NYSE OPEN or CLOSED @TC-003-02", async ({ page }) => {
    await page.goto("/workspace");
    const session = page.getByTestId("market-session");
    await expect(session).toBeVisible();
    await expect(session).toHaveText(/^(OPEN|CLOSED)$/);
    await expect(page.getByTestId("market-clock")).toBeVisible();
    await expect(page.getByTestId("connection-dot")).toHaveAttribute("data-connection", "live");
  });

  test("TC-003-03 reset layout restores defaults @TC-003-03", async ({ page }) => {
    await page.goto("/workspace");
    await expect(page.getByTestId("panel-chart")).toBeVisible();
    await expect
      .poll(async () => page.evaluate((key) => localStorage.getItem(key), LAYOUT_STORAGE_KEY))
      .not.toBeNull();

    const sash = page.locator(".dv-sash.dv-enabled").first();
    const box = await sash.boundingBox();
    expect(box).not.toBeNull();
    if (!box) {
      throw new Error("sash bounding box missing");
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();

    const resized = await page.evaluate((key) => localStorage.getItem(key), LAYOUT_STORAGE_KEY);
    await page.getByTestId("reset-layout").click();
    await expect
      .poll(async () => page.evaluate((key) => localStorage.getItem(key), LAYOUT_STORAGE_KEY))
      .not.toBe(resized);
    await expect(page.getByTestId("panel-chart")).toBeVisible();
    await expect(page.getByTestId("panel-watchlist")).toBeVisible();
    await expect(page.getByTestId("panel-copilot")).toBeVisible();
  });

  test("Ctrl+K opens the palette placeholder", async ({ page }) => {
    await page.goto("/workspace");
    await page.keyboard.press("Control+K");
    await expect(page.getByTestId("command-palette")).toBeVisible();
  });
});
