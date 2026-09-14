import {
  addWatchlistItemAction,
  createWatchlistAction,
  listWatchlistsAction,
  searchInstrumentsAction,
} from "@/app/actions/watchlists";
import { createAlertRuleAction } from "@/app/actions/alerts";
import { createMonitorAction } from "@/app/actions/monitors";
import { submitOrderAction } from "@/app/actions/orders";
import { stubInstrumentBySymbol, stubQuoteForInstrument } from "@/lib/auth/stub-store";
import { isAuthStub } from "@/lib/auth/mode";
import type { WriteExecuteResult } from "@meridian/copilot";
import { orderDraftSchema, type CopilotWriteToolName } from "@meridian/schemas";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

async function resolveInstrument(
  symbol: string,
): Promise<{ ok: true; id: string; symbol: string } | { ok: false; error: string }> {
  if (isAuthStub()) {
    const row = stubInstrumentBySymbol(symbol);
    if (!row) {
      return { ok: false, error: "SYMBOL_NOT_FOUND" };
    }
    return { ok: true, id: row.id, symbol: row.symbol };
  }
  const found = await searchInstrumentsAction(symbol);
  if (!found.ok) {
    return { ok: false, error: found.message };
  }
  const match = found.data.find((row) => row.symbol.toUpperCase() === symbol.toUpperCase());
  if (!match) {
    return { ok: false, error: "SYMBOL_NOT_FOUND" };
  }
  return { ok: true, id: match.id, symbol: match.symbol };
}

/**
 * Executes an approved/auto-approved copilot write via the same Next actions
 * as the manual ticket / watchlist / alert UI.
 */
export async function runManualWrite(
  tool: CopilotWriteToolName,
  payload: Record<string, unknown>,
): Promise<WriteExecuteResult> {
  switch (tool) {
    case "propose_order": {
      const symbol = asString(payload.symbol);
      if (!symbol) {
        return { error: "SYMBOL_REQUIRED" };
      }
      const instrument = await resolveInstrument(symbol);
      if (!instrument.ok) {
        return { error: instrument.error };
      }
      let last = asNumber(payload.last_price);
      if (last === undefined && isAuthStub()) {
        last = stubQuoteForInstrument(instrument.id)?.last;
      }
      if (last === undefined) {
        return { error: "LAST_PRICE_REQUIRED" };
      }
      const draft = orderDraftSchema.parse({
        symbol: instrument.symbol,
        side: payload.side,
        qty: payload.qty,
        order_type: payload.order_type ?? "market",
        limit_price: payload.limit_price ?? null,
        stop_price: payload.stop_price ?? null,
        tif: payload.tif ?? "DAY",
      });
      const created = await submitOrderAction({ draft, last_price: last });
      if (!created.ok) {
        return { error: created.message };
      }
      return {
        ref: created.data.order.id,
        reject_reason: created.data.order.reject_reason ?? undefined,
      };
    }
    case "create_watchlist_item": {
      const symbol = asString(payload.symbol);
      if (!symbol) {
        return { error: "SYMBOL_REQUIRED" };
      }
      const instrument = await resolveInstrument(symbol);
      if (!instrument.ok) {
        return { error: instrument.error };
      }
      const lists = await listWatchlistsAction();
      if (!lists.ok) {
        return { error: lists.message };
      }
      let watchlistId = asString(payload.watchlist_id);
      if (watchlistId && !lists.data.some((row) => row.id === watchlistId)) {
        return { error: "WATCHLIST_NOT_FOUND" };
      }
      if (!watchlistId) {
        if (lists.data[0]) {
          watchlistId = lists.data[0].id;
        } else {
          const created = await createWatchlistAction("Default");
          if (!created.ok) {
            return { error: created.message };
          }
          watchlistId = created.data.id;
        }
      }
      const added = await addWatchlistItemAction(watchlistId, instrument.id, instrument.symbol);
      if (!added.ok) {
        return { error: added.message };
      }
      return { ref: added.data.id };
    }
    case "create_alert": {
      const created = await createAlertRuleAction({
        symbol: payload.symbol,
        kind: payload.kind,
        threshold: payload.threshold,
        name: payload.name,
      });
      if (!created.ok) {
        return { error: created.message };
      }
      return { ref: created.data.id };
    }
    case "create_monitor": {
      const created = await createMonitorAction({
        name: asString(payload.name),
        nl_instruction: asString(payload.nl_instruction) ?? "Monitor",
        symbols: Array.isArray(payload.symbols)
          ? payload.symbols.filter((row): row is string => typeof row === "string")
          : undefined,
      });
      if (!created.ok) {
        return { error: created.message };
      }
      return { ref: created.data.id };
    }
    default:
      return { error: `UNKNOWN_WRITE_TOOL:${tool}` };
  }
}
