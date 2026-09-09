import { expect, test } from "@playwright/test";
import { STUB_AAPL_INSTRUMENT_ID } from "../lib/auth/stub-store";
import { TEST_TICK_BATCH_EVENT } from "../lib/quotes/transport";
import { forceNextStubOrderReject } from "./helpers/force-order-reject";
import { signUpThroughWizard } from "./helpers/onboard";

async function addAaplAndForceLast(
  page: import("@playwright/test").Page,
  last: number,
): Promise<void> {
  await page.getByTestId("watchlist-name").fill("Ticket");
  await page.getByTestId("watchlist-create").click();
  await expect(page.getByTestId("watchlist-tab-Ticket")).toBeVisible();
  await page.getByTestId("watchlist-search").fill("AAPL");
  await page.getByTestId("instrument-option-AAPL").click();
  await page.getByTestId("watchlist-row-AAPL").click();
  await expect(page.getByTestId("order-ticket-symbol")).toHaveText("AAPL");
  await expect(page.getByTestId("order-last")).toContainText(/\d+\.\d{2}/);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.evaluate(
      ({ eventName, instrumentId, price }) => {
        window.dispatchEvent(
          new CustomEvent(eventName, {
            detail: {
              ts: new Date().toISOString(),
              ticks: [
                {
                  instrument_id: instrumentId,
                  symbol: "AAPL",
                  bid: price - 0.1,
                  ask: price + 0.1,
                  last: price,
                  prev_close: 185,
                  volume: 2,
                  ts: new Date().toISOString(),
                },
              ],
            },
          }),
        );
      },
      { eventName: TEST_TICK_BATCH_EVENT, instrumentId: STUB_AAPL_INSTRUMENT_ID, price: last },
    );
    try {
      await expect(page.getByTestId("order-last")).toContainText("200.00", { timeout: 800 });
      return;
    } catch {
      /* subscribe may not be attached yet */
    }
  }
  await expect(page.getByTestId("order-last")).toContainText("200.00");
}

test.describe("PBI-013 order ticket", () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `ord-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("TC-013-01 oversized qty shows DT-RISK-01 reason then submit enables @TC-013-01", async ({
    page,
  }) => {
    await page.goto("/workspace");
    await expect(page.getByTestId("panel-orderTicket")).toBeVisible();
    await addAaplAndForceLast(page, 200);
    await page.getByTestId("order-qty").fill("300");
    await expect(page.getByTestId("preview-rule-DT-RISK-01")).toContainText("RISK_MAX_NOTIONAL");
    await expect(page.getByTestId("order-submit")).toBeDisabled();
    await page.getByTestId("order-qty").fill("5");
    await expect(page.getByTestId("preview-rule-DT-RISK-01")).toHaveAttribute("data-passed", "1");
    await expect(page.getByTestId("order-submit")).toBeEnabled();
  });

  test("TC-013-02 confirm modal totals match preview @TC-013-02", async ({ page }) => {
    await page.goto("/workspace");
    await addAaplAndForceLast(page, 200);
    await page.getByTestId("order-qty").fill("5");
    await expect(page.getByTestId("order-submit")).toBeEnabled();
    const previewTotal = await page.getByTestId("preview-est-total").innerText();
    const previewFees = await page.getByTestId("preview-fees").innerText();
    await page.getByTestId("order-submit").click();
    await expect(page.getByTestId("order-confirm-modal")).toBeVisible();
    await expect(page.getByTestId("confirm-est-total")).toHaveText(previewTotal);
    await expect(page.getByTestId("confirm-fees")).toHaveText(previewFees);
  });

  test("rejected create stays on confirm and shows reject_reason plus rule_audit_id", async ({
    page,
  }) => {
    await page.goto("/workspace");
    await addAaplAndForceLast(page, 200);
    await page.getByTestId("order-qty").fill("5");
    await expect(page.getByTestId("order-submit")).toBeEnabled();
    await page.getByTestId("order-submit").click();
    await expect(page.getByTestId("order-confirm-modal")).toBeVisible();
    await forceNextStubOrderReject(page);
    await page.getByTestId("order-confirm-submit").click();
    await expect(page.getByTestId("order-confirm-modal")).toBeVisible();
    await expect(page.getByTestId("order-reject-reason")).toHaveText("RISK_BUYING_POWER");
    await expect(page.getByTestId("order-rule-audit-id")).toContainText("Rule audit ID:");
    await expect(page.getByTestId("order-rule-audit-id")).toContainText(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  });

  test("TC-013-03 1000 notional at 200 last is 5 shares @TC-013-03", async ({ page }) => {
    await page.goto("/workspace");
    await addAaplAndForceLast(page, 200);
    await page.getByTestId("order-qty-mode").selectOption("notional");
    await page.getByTestId("order-notional").fill("1000");
    await expect(page.getByTestId("order-qty-shares")).toHaveText("5 shares");
  });
});
