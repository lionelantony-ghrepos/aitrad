import { expect, test } from "@playwright/test";
import { STUB_AAPL_INSTRUMENT_ID, STUB_MSFT_INSTRUMENT_ID } from "../../lib/auth/stub-store";
import { LAYOUT_STORAGE_KEY } from "../../lib/layout-storage";
import { TEST_TICK_BATCH_EVENT } from "../../lib/quotes/transport";
import { signUpThroughWizard } from "../helpers/onboard";
import { waitForWorkspaceReady } from "../helpers/palette";

function layoutGrid(raw: string | null): unknown {
  if (raw === null) {
    return null;
  }
  const parsed = JSON.parse(raw) as { dockview?: { grid?: unknown } };
  return parsed.dockview?.grid ?? null;
}

test.describe("P0 watchlist, chart, layout @P0", () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `p0-wl-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("resize then reload keeps layout @TC-003-01 @P0", async ({ page }) => {
    await page.goto("/workspace");
    await waitForWorkspaceReady(page);
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
    await waitForWorkspaceReady(page);
    await expect(page.getByTestId("panel-chart")).toBeVisible();
    const afterReload = await page.evaluate((key) => localStorage.getItem(key), LAYOUT_STORAGE_KEY);
    expect(layoutGrid(afterReload)).toEqual(layoutGrid(afterResize));
  });

  test("create list, add AAPL twice @TC-007-01 @P0", async ({ page }) => {
    await page.goto("/workspace");
    await expect(page.getByTestId("panel-watchlist")).toBeVisible();
    await page.getByTestId("watchlist-name").fill("Core");
    await page.getByTestId("watchlist-create").click();
    await expect(page.getByTestId("watchlist-tab-Core")).toBeVisible();
    await page.getByTestId("watchlist-search").fill("AAPL");
    await page.getByTestId("instrument-option-AAPL").click();
    await expect(page.getByTestId("watchlist-row-AAPL")).toBeVisible();
    await page.getByTestId("watchlist-search").fill("AAPL");
    await page.getByTestId("instrument-option-AAPL").click();
    await expect(page.getByTestId("watchlist-error")).toHaveText("AAPL is already on this list");
    await expect(page.getByTestId("watchlist-row-AAPL")).toHaveCount(1);
  });

  test("force price change flashes last @TC-007-02 @P0", async ({ page }) => {
    await page.goto("/workspace");
    await page.getByTestId("watchlist-name").fill("Live");
    await page.getByTestId("watchlist-create").click();
    await page.getByTestId("watchlist-search").fill("AAPL");
    await page.getByTestId("instrument-option-AAPL").click();
    await expect(page.getByTestId("watchlist-row-AAPL")).toBeVisible();
    const lastCell = page.getByTestId("watchlist-last-AAPL");
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await page.evaluate(
        ({ eventName, instrumentId }) => {
          window.dispatchEvent(
            new CustomEvent(eventName, {
              detail: {
                ts: new Date().toISOString(),
                ticks: [
                  {
                    instrument_id: instrumentId,
                    symbol: "AAPL",
                    bid: 199.9,
                    ask: 200.1,
                    last: 200,
                    prev_close: 185,
                    volume: 2,
                    ts: new Date().toISOString(),
                  },
                ],
              },
            }),
          );
        },
        { eventName: TEST_TICK_BATCH_EVENT, instrumentId: STUB_AAPL_INSTRUMENT_ID },
      );
      try {
        await expect(lastCell).toHaveText("200.00", { timeout: 800 });
        await expect(lastCell).toHaveAttribute("data-flash", "up", { timeout: 800 });
        return;
      } catch {
        /* quote subscribe may not be attached yet */
      }
    }
    await expect(lastCell).toHaveText("200.00");
    await expect(lastCell).toHaveAttribute("data-flash", "up");
  });

  test("click MSFT sets symbolContext @TC-007-03 @P0", async ({ page }) => {
    await page.goto("/workspace");
    await page.getByTestId("watchlist-name").fill("Peers");
    await page.getByTestId("watchlist-create").click();
    await page.getByTestId("watchlist-search").fill("MSFT");
    await page.getByTestId("instrument-option-MSFT").click();
    await expect(page.getByTestId("watchlist-row-MSFT")).toHaveAttribute(
      "data-instrument-id",
      STUB_MSFT_INSTRUMENT_ID,
    );
    await page.getByTestId("watchlist-row-MSFT").click();
    await expect(page.getByTestId("symbol-context-readout")).toHaveText("MSFT");
  });

  test("chart ranges use 1m on 1D @TC-008-01 @P0", async ({ page }) => {
    await page.goto("/workspace");
    await expect(page.getByTestId("panel-chart")).toBeVisible();
    await page.getByTestId("watchlist-name").fill("Chart");
    await page.getByTestId("watchlist-create").click();
    await page.getByTestId("watchlist-search").fill("MSFT");
    await page.getByTestId("instrument-option-MSFT").click();
    await page.getByTestId("watchlist-row-MSFT").click();
    await expect(page.getByTestId("chart-symbol")).toHaveText("MSFT");
    await expect(page.getByTestId("panel-chart")).toHaveAttribute("data-timeframe", "1m");
    for (const range of ["1W", "1M", "1Y", "5Y"] as const) {
      await page.getByTestId(`chart-range-${range}`).click();
      await expect(page.getByTestId("panel-chart")).toHaveAttribute("data-range", range);
      await expect(page.getByTestId("panel-chart")).toHaveAttribute("data-timeframe", "1d");
    }
    await page.getByTestId("chart-range-1D").click();
    await expect(page.getByTestId("panel-chart")).toHaveAttribute("data-timeframe", "1m");
  });
});
