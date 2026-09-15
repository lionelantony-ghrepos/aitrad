import { expect, type Page } from "@playwright/test";
import { TEST_TICK_BATCH_EVENT } from "../../lib/quotes/transport";

export async function dispatchLastTick(
  page: Page,
  input: { symbol: string; instrumentId: string; last: number; prevClose?: number },
): Promise<void> {
  await page.evaluate(
    ({ eventName, symbol, instrumentId, last, prevClose }) => {
      window.dispatchEvent(
        new CustomEvent(eventName, {
          detail: {
            ts: new Date().toISOString(),
            ticks: [
              {
                instrument_id: instrumentId,
                symbol,
                bid: last - 0.1,
                ask: last + 0.1,
                last,
                prev_close: prevClose ?? last,
                volume: 2,
                ts: new Date().toISOString(),
              },
            ],
          },
        }),
      );
    },
    {
      eventName: TEST_TICK_BATCH_EVENT,
      symbol: input.symbol,
      instrumentId: input.instrumentId,
      last: input.last,
      prevClose: input.prevClose,
    },
  );
}

export async function forceOrderLast(
  page: Page,
  input: { symbol: string; instrumentId: string; last: number; prevClose?: number },
): Promise<void> {
  const label = input.last.toFixed(2);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await dispatchLastTick(page, input);
    try {
      await expect(page.getByTestId("order-last")).toContainText(label, { timeout: 800 });
      return;
    } catch {
      /* subscribe may not be attached yet */
    }
  }
  await expect(page.getByTestId("order-last")).toContainText(label);
}

export async function ensureWatchlistSymbol(
  page: Page,
  listName: string,
  symbol: string,
): Promise<void> {
  const tab = page.getByTestId(`watchlist-tab-${listName}`);
  if (!(await tab.isVisible().catch(() => false))) {
    await page.getByTestId("watchlist-name").fill(listName);
    await page.getByTestId("watchlist-create").click();
    await expect(tab).toBeVisible();
  } else {
    await tab.click();
  }
  const row = page.getByTestId(`watchlist-row-${symbol}`);
  if (!(await row.isVisible().catch(() => false))) {
    await page.getByTestId("watchlist-search").fill(symbol);
    await page.getByTestId(`instrument-option-${symbol}`).click();
  }
  await expect(row).toBeVisible();
  await row.click();
}
