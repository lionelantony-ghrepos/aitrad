import { expect, test } from "@playwright/test";
import { STUB_AAPL_INSTRUMENT_ID } from "../../lib/auth/stub-store";
import { applyStubTicks } from "../helpers/apply-ticks";
import { forceNextStubOrderReject } from "../helpers/force-order-reject";
import { signUpThroughWizard } from "../helpers/onboard";
import { ensureWatchlistSymbol, forceOrderLast } from "../helpers/ticks";

test.describe("P0 orders, blotter, bracket, portfolio @P0", () => {
  test.describe.configure({ timeout: 60_000 });
  test.beforeEach(async ({ page, request }) => {
    await request.post("/api/e2e/reset");
    await signUpThroughWizard(
      page,
      `p0-ord-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    );
  });

  test("oversized qty shows DT-RISK-01 then submit enables @TC-013-01 @P0", async ({ page }) => {
    await page.goto("/workspace");
    await expect(page.getByTestId("panel-orderTicket")).toBeVisible();
    await ensureWatchlistSymbol(page, "P0Ord", "AAPL");
    await forceOrderLast(page, {
      symbol: "AAPL",
      instrumentId: STUB_AAPL_INSTRUMENT_ID,
      last: 200,
      prevClose: 185,
    });
    await page.getByTestId("order-qty").fill("300");
    await expect(page.getByTestId("preview-rule-DT-RISK-01")).toContainText("RISK_MAX_NOTIONAL");
    await expect(page.getByTestId("order-submit")).toBeDisabled();
    await page.getByTestId("order-qty").fill("5");
    await expect(page.getByTestId("preview-rule-DT-RISK-01")).toHaveAttribute("data-passed", "1");
    await expect(page.getByTestId("order-submit")).toBeEnabled();
  });

  test("confirm modal totals match preview @TC-013-02 @P0", async ({ page }) => {
    await page.goto("/workspace");
    await ensureWatchlistSymbol(page, "P0Ord", "AAPL");
    await forceOrderLast(page, {
      symbol: "AAPL",
      instrumentId: STUB_AAPL_INSTRUMENT_ID,
      last: 200,
      prevClose: 185,
    });
    await page.getByTestId("order-qty").fill("5");
    await expect(page.getByTestId("order-submit")).toBeEnabled();
    const previewTotal = await page.getByTestId("preview-est-total").innerText();
    const previewFees = await page.getByTestId("preview-fees").innerText();
    await page.getByTestId("order-submit").click();
    await expect(page.getByTestId("order-confirm-modal")).toBeVisible();
    await expect(page.getByTestId("confirm-est-total")).toHaveText(previewTotal);
    await expect(page.getByTestId("confirm-fees")).toHaveText(previewFees);
  });

  test("working limit cancel from blotter @TC-017-01 @P0", async ({ page }) => {
    await page.goto("/workspace");
    await expect(page.getByTestId("panel-blotter")).toBeVisible();
    await ensureWatchlistSymbol(page, "P0Ord", "AAPL");
    await forceOrderLast(page, {
      symbol: "AAPL",
      instrumentId: STUB_AAPL_INSTRUMENT_ID,
      last: 200,
      prevClose: 185,
    });
    await page.getByTestId("order-type").selectOption("limit");
    await page.getByTestId("order-qty").fill("1");
    await page.getByTestId("order-limit").fill("100");
    await expect(page.getByTestId("order-submit")).toBeEnabled();
    await page.getByTestId("order-submit").click();
    await expect(page.getByTestId("order-confirm-modal")).toBeVisible();
    await page.getByTestId("order-confirm-submit").click();
    await expect(page.getByTestId("order-confirm-modal")).toHaveCount(0, { timeout: 8_000 });
    const row = page.locator("[data-testid^='blotter-row-'][data-symbol='AAPL']").first();
    await expect(row).toHaveAttribute("data-status", /accepted|working/, { timeout: 8_000 });
    await row.getByTestId("blotter-cancel").click({ force: true });
    await expect(row).toHaveAttribute("data-status", "cancelled");
  });

  test("rejected order Explain shows rule rows @TC-017-02 @P0", async ({ page }) => {
    await page.goto("/workspace");
    await ensureWatchlistSymbol(page, "P0Ord", "AAPL");
    await forceOrderLast(page, {
      symbol: "AAPL",
      instrumentId: STUB_AAPL_INSTRUMENT_ID,
      last: 200,
      prevClose: 185,
    });
    await page.getByTestId("order-qty").fill("5");
    await expect(page.getByTestId("order-submit")).toBeEnabled();
    await page.getByTestId("order-submit").click();
    await expect(page.getByTestId("order-confirm-modal")).toBeVisible();
    await forceNextStubOrderReject(page);
    await page.getByTestId("order-confirm-submit").click();
    await expect(page.getByTestId("order-reject-reason")).toHaveText("RISK_BUYING_POWER");
    await page.getByTestId("order-confirm-cancel").click();
    await page.getByTestId("blotter-tab-rejected").click();
    const row = page.locator("[data-testid^='blotter-row-'][data-symbol='AAPL']").first();
    await expect(row).toHaveAttribute("data-status", "rejected", { timeout: 8_000 });
    await row.getByTestId("blotter-explain").click();
    await expect(page.getByTestId("blotter-explain-popover")).toBeVisible();
    await expect(page.getByTestId("blotter-audit-row").first()).toBeVisible();
  });

  test("bracket TP fill cancels SL @TC-016-01 @P0", async ({ page }) => {
    await page.goto("/workspace");
    await expect(page.getByTestId("panel-orderTicket")).toBeVisible();
    await ensureWatchlistSymbol(page, "P0Brk", "AAPL");
    await forceOrderLast(page, {
      symbol: "AAPL",
      instrumentId: STUB_AAPL_INSTRUMENT_ID,
      last: 200,
      prevClose: 185,
    });
    await page.getByTestId("order-tab-bracket").click();
    await page.getByTestId("order-qty").fill("2");
    await page.getByTestId("order-tp-offset").fill("5");
    await page.getByTestId("order-sl-offset").fill("5");
    await expect(page.getByTestId("order-tp-live")).toContainText("205.00");
    await page.getByTestId("order-submit").click();
    await page.getByTestId("order-confirm-submit").click();
    await applyStubTicks(page, [
      { last: 200, symbol: "AAPL", instrument_id: STUB_AAPL_INSTRUMENT_ID },
    ]);
    await expect(page.getByTestId("blotter-leg-entry")).toHaveAttribute("data-status", "filled", {
      timeout: 8_000,
    });
    await forceOrderLast(page, {
      symbol: "AAPL",
      instrumentId: STUB_AAPL_INSTRUMENT_ID,
      last: 210,
    });
    await applyStubTicks(page, [
      { last: 210, symbol: "AAPL", instrument_id: STUB_AAPL_INSTRUMENT_ID },
    ]);
    await expect(page.getByTestId("blotter-status-take_profit")).toHaveText("filled", {
      timeout: 8_000,
    });
    await expect(page.getByTestId("blotter-status-stop_loss")).toHaveText("cancelled");
  });
});
