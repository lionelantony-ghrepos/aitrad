import type { CopilotAction, CopilotWriteToolName } from "@meridian/schemas";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function summarizeWritePayload(
  tool: CopilotWriteToolName,
  payload: Record<string, unknown>,
): string {
  switch (tool) {
    case "propose_order": {
      const side = (asString(payload.side) ?? "?").toUpperCase();
      const qty = asNumber(payload.qty);
      const symbol = (asString(payload.symbol) ?? "?").toUpperCase();
      const type = (asString(payload.order_type) ?? "market").toUpperCase();
      const tif = (asString(payload.tif) ?? "DAY").toUpperCase();
      const last = asNumber(payload.last_price);
      const notional = qty !== undefined && last !== undefined ? qty * last : undefined;
      const bits = [`${side} ${qty ?? "?"} ${symbol} ${type} ${tif}`];
      if (last !== undefined) {
        bits.push(`last ${last.toFixed(2)}`);
      }
      if (notional !== undefined) {
        bits.push(`notional ${notional.toFixed(2)}`);
      }
      if (payload.limit_price != null) {
        bits.push(`limit ${String(payload.limit_price)}`);
      }
      return bits.join(" · ");
    }
    case "create_watchlist_item":
      return `Add ${(asString(payload.symbol) ?? "?").toUpperCase()} to watchlist`;
    case "create_alert":
      return `Alert ${asString(payload.kind) ?? "?"} ${(asString(payload.symbol) ?? "?").toUpperCase()}${
        payload.threshold != null ? ` @ ${String(payload.threshold)}` : ""
      }`;
    case "create_monitor":
      return asString(payload.nl_instruction) ?? asString(payload.name) ?? "Monitor";
    default:
      return tool;
  }
}

export function summarizeCopilotAction(action: CopilotAction): string {
  return summarizeWritePayload(action.tool, action.payload);
}
