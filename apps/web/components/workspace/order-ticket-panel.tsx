"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import { notionalFromShares, sharesFromNotional } from "@meridian/paper-engine";
import {
  orderDraftSchema,
  type OrderDraft,
  type OrderPreviewResponse,
  type OrderSide,
  type OrderType,
  type QtyMode,
  type TimeInForce,
} from "@meridian/schemas";
import {
  applyPaperTicksAction,
  loadOrderTicketContextAction,
  previewOrderAction,
  submitOrderAction,
} from "@/app/actions/orders";
import { notifyOrdersChanged } from "@/lib/orders/orders-live";
import { useOrderTicketIntent } from "@/lib/order-ticket/intent";
import { interpretOrderCreateResult } from "@/lib/order-ticket/submit-result";
import { useQuotes } from "@/lib/quotes/use-quotes";
import { createInsforgeQuotesTransport, createWindowQuotesTransport } from "@/lib/quotes/transport";
import { useSymbolContext } from "@/lib/symbol-context";
import { useWorkspaceRuntime } from "@/lib/workspace-runtime";

const PREVIEW_DEBOUNCE_MS = 300;

function formatMoney(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function OrderTicketPanel(props: IDockviewPanelProps): React.JSX.Element {
  void props;
  const { e2eFeed } = useWorkspaceRuntime();
  const transport = useMemo(
    () => (e2eFeed ? createWindowQuotesTransport() : createInsforgeQuotesTransport()),
    [e2eFeed],
  );
  const activeSymbol = useSymbolContext((s) => s.activeSymbol);
  const setActiveSymbol = useSymbolContext((s) => s.setActiveSymbol);
  const intentSide = useOrderTicketIntent((s) => s.side);
  const setIntentSide = useOrderTicketIntent((s) => s.setSide);
  const ticketPrefill = useOrderTicketIntent((s) => s.prefill);

  const [instrumentId, setInstrumentId] = useState<string | null>(null);
  const [buyingPower, setBuyingPower] = useState<number | null>(null);
  const [seedLast, setSeedLast] = useState<number | null>(null);
  const [status, setStatus] = useState<"empty" | "loading" | "ready" | "error">("empty");
  const [error, setError] = useState<string | null>(null);

  const [side, setSide] = useState<OrderSide>(intentSide);
  const [qtyMode, setQtyMode] = useState<QtyMode>("shares");
  const [qtyInput, setQtyInput] = useState("1");
  const [notionalInput, setNotionalInput] = useState("");
  const [ticketTab, setTicketTab] = useState<"single" | "bracket">("single");
  const [orderType, setOrderType] = useState<OrderType | "trailing_stop">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [tpOffset, setTpOffset] = useState("5");
  const [slOffset, setSlOffset] = useState("5");
  const [trailType, setTrailType] = useState<"percent" | "amount">("percent");
  const [trailValue, setTrailValue] = useState("");
  const [tif, setTif] = useState<TimeInForce>("DAY");
  const [preview, setPreview] = useState<OrderPreviewResponse | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [ruleAuditLine, setRuleAuditLine] = useState<string | null>(null);

  useEffect(() => {
    setSide(intentSide);
  }, [intentSide]);

  useEffect(() => {
    if (!ticketPrefill) {
      return;
    }
    const draft = ticketPrefill.draft;
    setActiveSymbol(draft.symbol);
    setSide(draft.side);
    setQtyMode("shares");
    setQtyInput(String(draft.qty));
    setTicketTab(draft.group_type === "bracket" ? "bracket" : "single");
    setOrderType(
      draft.trail_type
        ? "trailing_stop"
        : draft.group_type === "bracket"
          ? "market"
          : draft.order_type,
    );
    setLimitPrice(draft.limit_price == null ? "" : String(draft.limit_price));
    setStopPrice(draft.stop_price == null ? "" : String(draft.stop_price));
    setTrailType(draft.trail_type ?? "percent");
    setTrailValue(draft.trail_value == null ? "" : String(draft.trail_value));
    setTif(draft.tif);
  }, [ticketPrefill, setActiveSymbol]);

  const symbols = activeSymbol ? [activeSymbol] : [];
  const ids = instrumentId ? [instrumentId] : [];
  const { quotes } = useQuotes(symbols, { transport, instrumentIds: ids });
  const liveLast = instrumentId ? (quotes[instrumentId]?.last ?? seedLast) : seedLast;

  useEffect(() => {
    if (!activeSymbol) {
      setStatus("empty");
      setInstrumentId(null);
      setBuyingPower(null);
      setPreview(null);
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setError(null);
    void loadOrderTicketContextAction(activeSymbol).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setStatus("error");
        setError(result.message);
        return;
      }
      setInstrumentId(result.data.instrument.id);
      setBuyingPower(result.data.account.cash_balance - (result.data.account.reserved_cash ?? 0));
      setSeedLast(result.data.quote?.last ?? null);
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [activeSymbol]);

  const qtyShares = useMemo(() => {
    const last = liveLast ?? 0;
    if (qtyMode === "notional") {
      const notional = Number(notionalInput);
      return sharesFromNotional(notional, last);
    }
    return Number(qtyInput);
  }, [qtyMode, qtyInput, notionalInput, liveLast]);

  const last = liveLast;
  const tpLive =
    last != null ? (side === "buy" ? last + Number(tpOffset) : last - Number(tpOffset)) : null;
  const slLive =
    last != null ? (side === "buy" ? last - Number(slOffset) : last + Number(slOffset)) : null;

  const draft: OrderDraft | null = useMemo(() => {
    if (!activeSymbol) {
      return null;
    }
    const trailing = ticketTab === "single" && orderType === "trailing_stop";
    const parsed = orderDraftSchema.safeParse({
      symbol: activeSymbol,
      side,
      qty: qtyShares,
      order_type: ticketTab === "bracket" ? "market" : trailing ? "stop" : orderType,
      limit_price: limitPrice === "" ? null : Number(limitPrice),
      stop_price: stopPrice === "" ? null : Number(stopPrice),
      tif,
      group_type: ticketTab === "bracket" ? "bracket" : null,
      tp_price:
        ticketTab === "bracket" && tpLive != null && Number.isFinite(tpLive) ? tpLive : null,
      sl_price:
        ticketTab === "bracket" && slLive != null && Number.isFinite(slLive) ? slLive : null,
      trail_type: trailing ? trailType : null,
      trail_value: trailing && trailValue !== "" ? Number(trailValue) : null,
    });
    return parsed.success ? parsed.data : null;
  }, [
    activeSymbol,
    side,
    qtyShares,
    orderType,
    limitPrice,
    stopPrice,
    tif,
    ticketTab,
    tpLive,
    slLive,
    trailType,
    trailValue,
  ]);

  useEffect(() => {
    if (!draft || liveLast == null || status !== "ready") {
      return;
    }
    setPreviewing(true);
    const handle = window.setTimeout(() => {
      void previewOrderAction({ draft, last_price: liveLast }).then((result) => {
        if (!result.ok) {
          setError(result.message);
          setPreview(null);
          setPreviewing(false);
          return;
        }
        setPreview(result.data);
        setError(null);
        setPreviewing(false);
      });
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(handle);
    };
  }, [draft, liveLast, status]);

  const onSide = useCallback(
    (next: OrderSide) => {
      setSide(next);
      setIntentSide(next);
    },
    [setIntentSide],
  );

  const onQtyMode = useCallback(
    (next: QtyMode) => {
      const last = liveLast ?? 0;
      if (next === "notional") {
        const shares = Number(qtyInput);
        setNotionalInput(last > 0 ? String(notionalFromShares(shares, last)) : "");
      } else {
        const notional = Number(notionalInput);
        setQtyInput(last > 0 ? String(sharesFromNotional(notional, last)) : qtyInput);
      }
      setQtyMode(next);
    },
    [liveLast, qtyInput, notionalInput],
  );

  const needsLimit =
    ticketTab === "single" && (orderType === "limit" || orderType === "stop_limit");
  const needsStop = ticketTab === "single" && (orderType === "stop" || orderType === "stop_limit");
  const needsTrail = ticketTab === "single" && orderType === "trailing_stop";
  const canSubmit = preview?.passed === true && !previewing;

  function clearSubmitFeedback(): void {
    setSubmitError(null);
    setRejectReason(null);
    setRuleAuditLine(null);
  }

  async function onConfirmSubmit(): Promise<void> {
    if (!draft || liveLast == null) {
      return;
    }
    clearSubmitFeedback();
    try {
      const result = await submitOrderAction({ draft, last_price: liveLast });
      const ui = interpretOrderCreateResult(result);
      if (ui.kind === "accepted") {
        setConfirmOpen(false);
        if (instrumentId && liveLast != null) {
          await applyPaperTicksAction([
            {
              instrument_id: instrumentId,
              symbol: activeSymbol ?? undefined,
              last: liveLast,
            },
          ]);
        }
        notifyOrdersChanged();
        return;
      }
      if (ui.kind === "error") {
        setSubmitError(ui.message);
        return;
      }
      setRejectReason(ui.reason);
      setRuleAuditLine(ui.auditLine);
      notifyOrdersChanged();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Order submit failed.");
    }
  }

  const displayedNotional =
    liveLast != null && Number.isFinite(qtyShares) ? notionalFromShares(qtyShares, liveLast) : 0;

  return (
    <div
      className="flex h-full flex-col gap-2 overflow-auto bg-background p-2 text-xs text-foreground"
      data-testid="panel-orderTicket"
      data-side={side}
    >
      <div className="flex items-center justify-between">
        <p className="font-medium text-primary">Order ticket</p>
        <p className="font-mono text-primary" data-testid="order-ticket-symbol">
          {activeSymbol ?? ""}
        </p>
      </div>

      {status === "empty" ? (
        <p className="text-muted-foreground" data-testid="order-ticket-empty">
          Select a symbol to trade.
        </p>
      ) : null}
      {status === "loading" ? (
        <p className="text-muted-foreground" data-testid="order-ticket-loading">
          Loading ticket…
        </p>
      ) : null}
      {status === "error" ? (
        <p className="text-down" data-testid="order-ticket-error">
          {error}
        </p>
      ) : null}

      {status === "ready" ? (
        <>
          <div className="flex gap-1">
            <button
              type="button"
              className={`h-7 flex-1 border ${side === "buy" ? "border-up text-up" : "border-border text-muted-foreground"}`}
              data-testid="order-side-buy"
              onClick={() => {
                onSide("buy");
              }}
            >
              Buy
            </button>
            <button
              type="button"
              className={`h-7 flex-1 border ${side === "sell" ? "border-down text-down" : "border-border text-muted-foreground"}`}
              data-testid="order-side-sell"
              onClick={() => {
                onSide("sell");
              }}
            >
              Sell
            </button>
          </div>

          <label className="flex flex-col gap-1 text-muted-foreground">
            Qty mode
            <select
              className="h-7 border border-input bg-background px-1 text-foreground"
              data-testid="order-qty-mode"
              value={qtyMode}
              onChange={(event) => {
                onQtyMode(event.target.value as QtyMode);
              }}
            >
              <option value="shares">Shares</option>
              <option value="notional">Notional</option>
            </select>
          </label>

          {qtyMode === "shares" ? (
            <label className="flex flex-col gap-1 text-muted-foreground">
              Quantity
              <input
                className="h-7 border border-input bg-background px-1 font-mono text-foreground tabular-nums"
                data-testid="order-qty"
                inputMode="decimal"
                value={qtyInput}
                onChange={(event) => {
                  setQtyInput(event.target.value);
                }}
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-muted-foreground">
              Notional
              <input
                className="h-7 border border-input bg-background px-1 font-mono text-foreground tabular-nums"
                data-testid="order-notional"
                inputMode="decimal"
                value={notionalInput}
                onChange={(event) => {
                  setNotionalInput(event.target.value);
                }}
              />
            </label>
          )}
          <p
            className="font-mono tabular-nums text-muted-foreground"
            data-testid="order-qty-shares"
          >
            {Number.isFinite(qtyShares) ? qtyShares : "—"} shares
          </p>

          <div className="flex gap-1">
            <button
              type="button"
              className={`h-7 flex-1 border ${ticketTab === "single" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
              data-testid="order-tab-single"
              onClick={() => {
                setTicketTab("single");
              }}
            >
              Single
            </button>
            <button
              type="button"
              className={`h-7 flex-1 border ${ticketTab === "bracket" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
              data-testid="order-tab-bracket"
              onClick={() => {
                setTicketTab("bracket");
              }}
            >
              Bracket
            </button>
          </div>

          <label className="flex flex-col gap-1 text-muted-foreground">
            Type
            <select
              className="h-7 border border-input bg-background px-1 text-foreground"
              data-testid="order-type"
              value={ticketTab === "bracket" ? "market" : orderType}
              disabled={ticketTab === "bracket"}
              onChange={(event) => {
                setOrderType(event.target.value as OrderType | "trailing_stop");
              }}
            >
              <option value="market">Market</option>
              <option value="limit">Limit</option>
              <option value="stop">Stop</option>
              <option value="stop_limit">Stop-limit</option>
              <option value="trailing_stop">Trailing stop</option>
            </select>
          </label>

          {needsLimit ? (
            <label className="flex flex-col gap-1 text-muted-foreground">
              Limit
              <input
                className="h-7 border border-input bg-background px-1 font-mono tabular-nums"
                data-testid="order-limit"
                value={limitPrice}
                onChange={(event) => {
                  setLimitPrice(event.target.value);
                }}
              />
            </label>
          ) : null}
          {needsStop ? (
            <label className="flex flex-col gap-1 text-muted-foreground">
              Stop
              <input
                className="h-7 border border-input bg-background px-1 font-mono tabular-nums"
                data-testid="order-stop"
                value={stopPrice}
                onChange={(event) => {
                  setStopPrice(event.target.value);
                }}
              />
            </label>
          ) : null}

          {needsTrail ? (
            <>
              <label className="flex flex-col gap-1 text-muted-foreground">
                Trail type
                <select
                  className="h-7 border border-input bg-background px-1 text-foreground"
                  data-testid="order-trail-type"
                  value={trailType}
                  onChange={(event) => {
                    setTrailType(event.target.value as "percent" | "amount");
                  }}
                >
                  <option value="percent">Percent</option>
                  <option value="amount">Amount</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-muted-foreground">
                Trail value
                <input
                  className="h-7 border border-input bg-background px-1 font-mono tabular-nums"
                  data-testid="order-trail-value"
                  value={trailValue}
                  onChange={(event) => {
                    setTrailValue(event.target.value);
                  }}
                />
              </label>
            </>
          ) : null}

          {ticketTab === "bracket" ? (
            <>
              <label className="flex flex-col gap-1 text-muted-foreground">
                Take-profit offset
                <input
                  className="h-7 border border-input bg-background px-1 font-mono tabular-nums"
                  data-testid="order-tp-offset"
                  value={tpOffset}
                  onChange={(event) => {
                    setTpOffset(event.target.value);
                  }}
                />
              </label>
              <p
                className="font-mono tabular-nums text-muted-foreground"
                data-testid="order-tp-live"
              >
                TP {tpLive != null && Number.isFinite(tpLive) ? formatMoney(tpLive) : "—"}
              </p>
              <label className="flex flex-col gap-1 text-muted-foreground">
                Stop-loss offset
                <input
                  className="h-7 border border-input bg-background px-1 font-mono tabular-nums"
                  data-testid="order-sl-offset"
                  value={slOffset}
                  onChange={(event) => {
                    setSlOffset(event.target.value);
                  }}
                />
              </label>
              <p
                className="font-mono tabular-nums text-muted-foreground"
                data-testid="order-sl-live"
              >
                SL {slLive != null && Number.isFinite(slLive) ? formatMoney(slLive) : "—"}
              </p>
            </>
          ) : null}

          <label className="flex flex-col gap-1 text-muted-foreground">
            TIF
            <select
              className="h-7 border border-input bg-background px-1 text-foreground"
              data-testid="order-tif"
              value={tif}
              onChange={(event) => {
                setTif(event.target.value as TimeInForce);
              }}
            >
              <option value="DAY">DAY</option>
              <option value="GTC">GTC</option>
              <option value="IOC">IOC</option>
            </select>
          </label>

          <p className="font-mono tabular-nums" data-testid="order-last">
            Last {liveLast != null ? formatMoney(liveLast) : "—"}
          </p>
          <p className="font-mono tabular-nums" data-testid="order-buying-power">
            Buying power {buyingPower != null ? formatMoney(buyingPower) : "—"}
          </p>
          <p className="font-mono tabular-nums" data-testid="order-notional-est">
            Notional {formatMoney(displayedNotional)}
          </p>

          <div className="flex flex-col gap-1" data-testid="order-preview-rules">
            {preview?.rules.map((rule, index) => (
              <p
                key={`${rule.table_key}-${index}`}
                className={rule.passed ? "text-up" : "text-down"}
                data-testid={`preview-rule-${rule.table_key}`}
                data-passed={rule.passed ? "1" : "0"}
              >
                {rule.table_key}: {rule.passed ? "pass" : "fail"} — {rule.reason}
              </p>
            ))}
            {previewing ? <p className="text-muted-foreground">Previewing…</p> : null}
          </div>
          {preview ? (
            <>
              <p className="font-mono tabular-nums" data-testid="preview-fees">
                Est. fees {formatMoney(preview.estimated_fees)}
              </p>
              <p className="font-mono tabular-nums" data-testid="preview-est-total">
                Est. total {formatMoney(preview.est_total)}
              </p>
            </>
          ) : null}

          <button
            type="button"
            className="h-8 border border-primary bg-primary text-primary-foreground disabled:opacity-40"
            data-testid="order-submit"
            disabled={!canSubmit}
            onClick={() => {
              clearSubmitFeedback();
              setConfirmOpen(true);
            }}
          >
            Submit
          </button>
        </>
      ) : null}

      {confirmOpen && preview ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-background/80"
          data-testid="order-confirm-modal"
        >
          <div className="w-80 border border-border bg-card p-3 text-xs">
            <p className="mb-2 font-medium text-primary">Confirm order</p>
            <p data-testid="confirm-summary">
              {side.toUpperCase()} {qtyShares} {activeSymbol} {orderType} {tif}
            </p>
            <p className="font-mono tabular-nums" data-testid="confirm-fees">
              Est. fees {formatMoney(preview.estimated_fees)}
            </p>
            <p className="font-mono tabular-nums" data-testid="confirm-est-total">
              Est. total {formatMoney(preview.est_total)}
            </p>
            <p className="font-mono tabular-nums" data-testid="confirm-buying-power">
              Buying power {formatMoney(preview.buying_power)}
            </p>
            {submitError ? (
              <p className="text-down" data-testid="order-submit-error" role="alert">
                {submitError}
              </p>
            ) : null}
            {rejectReason ? (
              <div
                className="mt-1 flex flex-col gap-1"
                data-testid="order-reject-notice"
                role="alert"
              >
                <p className="text-down" data-testid="order-reject-reason">
                  {rejectReason}
                </p>
                {ruleAuditLine ? (
                  <p className="font-mono text-muted-foreground" data-testid="order-rule-audit-id">
                    {ruleAuditLine}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="mt-2 flex gap-1">
              <button
                type="button"
                className="h-7 flex-1 border border-border"
                data-testid="order-confirm-cancel"
                onClick={() => {
                  clearSubmitFeedback();
                  setConfirmOpen(false);
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="h-7 flex-1 border border-primary bg-primary text-primary-foreground"
                data-testid="order-confirm-submit"
                onClick={() => {
                  void onConfirmSubmit();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
