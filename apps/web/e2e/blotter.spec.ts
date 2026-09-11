import { expect, test } from "@playwright/test";
import { STUB_AAPL_INSTRUMENT_ID, STUB_MSFT_INSTRUMENT_ID } from "../lib/auth/stub-store";
import { TEST_TICK_BATCH_EVENT } from "../lib/quotes/transport";
import { forceNextStubOrderReject } from "./helpers/force-order-reject";
import { signUpThroughWizard } from "./helpers/onboard";

async function forceLast(
  page: import("@playwright/test").Page,
  symbol: string,
  instrumentId: string,
  last: number,
): Promise<void> {
  const label = last.toFixed(2);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.evaluate(
      ({ eventName, id, ticker, price }) => {
        window.dispatchEvent(
          new CustomEvent(eventName, {
            detail: {
              ts: new Date().toISOString(),
              ticks: [
                {
                  instrument_id: id,
                  symbol: ticker,
                  bid: price - 0.1,
                  ask: price + 0.1,
                  last: price,
                  prev_close: price,
                  volume: 2,
                  ts: new Date().toISOString(),
                },
              ],
            },
          }),
        );
      },
      { eventName: TEST_TICK_BATCH_EVENT, id: instrumentId, ticker: symbol, price: last },
    );
    try {
      await expect(page.getByTestId("order-last")).toContainText(label, { timeout: 800 });
      return;
    } catch {
      /* subscribe may not be attached yet */
    }
  }
  await expect(page.getByTestId("order-last")).toContainText(label);
}

async function addSymbol(
  page: import("@playwright/test").Page,
  listName: string,
  symbol: string,
): Promise<void> {
  const existing = page.getByTestId(`watchlist-tab-${listName}`);
  if (!(await existing.isVisible().catch(() => false))) {
    await page.getByTestId("watchlist-name").fill(listName);
    await page.getByTestId("watchlist-create").click();
    await expect(existing).toBeVisible();
  }
  await page.getByTestId("watchlist-search").fill(symbol);
  await page.getByTestId(`instrument-option-${symbol}`).click();
  await page.getByTestId(`watchlist-row-${symbol}`).click();
}

async function submitLimit(
  page: import("@playwright/test").Page,
  qty: string,
  limit: string,
): Promise<void> {
  await page.getByTestId("order-type").selectOption("limit");
  await page.getByTestId("order-qty").fill(qty);
  await page.getByTestId("order-limit").fill(limit);
  await expect(page.getByTestId("order-submit")).toBeEnabled();
  await page.getByTestId("order-submit").click();
  await page.getByTestId("order-confirm-submit").click();
}

test.describe("PBI-017 blotter", () => {
  test.describe.configure({ timeout: 60_000 });
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `blt-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("TC-017-01 place working limit then cancel from blotter live @TC-017-01", async ({
    page,
  }) => {
    await page.goto("/workspace");
    await expect(page.getByTestId("panel-blotter")).toBeVisible();
    await addSymbol(page, "Blt", "AAPL");
    await forceLast(page, "AAPL", STUB_AAPL_INSTRUMENT_ID, 200);
    await submitLimit(page, "1", "100");
    const row = page.locator("[data-testid^='blotter-row-'][data-symbol='AAPL']").first();
    await expect(row).toHaveAttribute("data-status", /accepted|working/, { timeout: 8_000 });
    await row.getByTestId("blotter-cancel").click({ force: true });
    await expect(row).toHaveAttribute("data-status", "cancelled");
    await expect(page).toHaveURL(/\/workspace/);
  });

  test("TC-017-02 rejected order Explain shows matched rule rows @TC-017-02", async ({ page }) => {
    await page.goto("/workspace");
    await addSymbol(page, "Blt", "AAPL");
    await forceLast(page, "AAPL", STUB_AAPL_INSTRUMENT_ID, 200);
    await page.getByTestId("order-qty").fill("5");
    await expect(page.getByTestId("order-submit")).toBeEnabled();
    await page.getByTestId("order-submit").click();
    await expect(page.getByTestId("order-confirm-modal")).toBeVisible();
    await forceNextStubOrderReject(page);
    await page.getByTestId("order-confirm-submit").click();
    await expect(page.getByTestId("order-reject-reason")).toHaveText("RISK_BUYING_POWER");
    await page.getByTestId("order-confirm-cancel").click();
    await expect(page.getByTestId("order-confirm-modal")).toHaveCount(0);
    await page.getByTestId("blotter-tab-rejected").click();
    const row = page.locator("[data-testid^='blotter-row-'][data-symbol='AAPL']").first();
    await expect(row).toHaveAttribute("data-status", "rejected", { timeout: 8_000 });
    await row.getByTestId("blotter-explain").click();
    await expect(page.getByTestId("blotter-explain-popover")).toBeVisible();
    await expect(page.getByTestId("blotter-reject-reason")).toHaveText("RISK_BUYING_POWER");
    await expect(page.getByTestId("blotter-audit-row").first()).toBeVisible();
  });

  test("TC-017-03 filter symbol then CSV matches grid @TC-017-03", async ({ page }) => {
    await page.goto("/workspace");
    await addSymbol(page, "Blt", "AAPL");
    await forceLast(page, "AAPL", STUB_AAPL_INSTRUMENT_ID, 200);
    await submitLimit(page, "1", "100");
    await expect(page.locator("[data-testid^='blotter-row-'][data-symbol='AAPL']")).toBeVisible({
      timeout: 8_000,
    });
    await addSymbol(page, "Blt", "MSFT");
    await forceLast(page, "MSFT", STUB_MSFT_INSTRUMENT_ID, 200);
    await submitLimit(page, "1", "100");
    await expect(page.locator("[data-testid^='blotter-row-'][data-symbol='MSFT']")).toBeVisible({
      timeout: 8_000,
    });
    await page.getByTestId("blotter-filter-symbol").fill("AAPL");
    await expect(page.locator("[data-testid^='blotter-row-'][data-symbol='MSFT']")).toHaveCount(0);
    await expect(page.locator("[data-testid^='blotter-row-'][data-symbol='AAPL']")).toHaveCount(1);
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("blotter-export").click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    if (!stream) {
      throw new Error("CSV stream missing");
    }
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const csv = Buffer.concat(chunks).toString("utf8");
    expect(csv).toContain("AAPL");
    expect(csv).not.toContain("MSFT");
  });
});
