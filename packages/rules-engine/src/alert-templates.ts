import {
  alertKindSchema,
  type AlertKind,
  type DecisionCondition,
  type DecisionRow,
} from "@meridian/schemas";

export type AlertTemplateParams = {
  kind: AlertKind;
  threshold?: number;
};

/**
 * Maps typed UI templates to rules-engine condition rows.
 * Numeric thresholds are user-supplied (except news polarity, which is the [-1, 1] sign).
 */
export function compileAlertTemplate(params: AlertTemplateParams): DecisionRow {
  const kind = alertKindSchema.parse(params.kind);
  const conditions = conditionsForKind(kind, params.threshold);
  return {
    id: "alert",
    priority: 1,
    conditions,
    outputs: { decision: "fire" },
  };
}

export function defaultAlertName(
  kind: AlertKind,
  threshold: number | undefined,
  symbol: string,
): string {
  const sym = symbol.trim() || "ALL";
  switch (kind) {
    case "price_cross_above":
      return `${sym} price crosses above ${threshold ?? ""}`.trim();
    case "price_cross_below":
      return `${sym} price crosses below ${threshold ?? ""}`.trim();
    case "pct_chg":
      return `${sym} %chg > ${threshold ?? ""}`.trim();
    case "volume":
      return `${sym} volume > ${threshold ?? ""}`.trim();
    case "rsi":
      return `${sym} RSI < ${threshold ?? ""}`.trim();
    case "news_sentiment":
      return `${sym} negative news`;
  }
}

function conditionsForKind(kind: AlertKind, threshold: number | undefined): DecisionCondition[] {
  switch (kind) {
    case "price_cross_above": {
      const x = requireThreshold(threshold);
      return [
        { input: "last", op: "gt", value: x },
        { input: "prev_last", op: "lte", value: x },
      ];
    }
    case "price_cross_below": {
      const x = requireThreshold(threshold);
      return [
        { input: "last", op: "lt", value: x },
        { input: "prev_last", op: "gte", value: x },
      ];
    }
    case "pct_chg":
      return [{ input: "pct_chg", op: "gt", value: requireThreshold(threshold) }];
    case "volume":
      return [{ input: "volume", op: "gt", value: requireThreshold(threshold) }];
    case "rsi":
      return [{ input: "rsi_14", op: "lt", value: requireThreshold(threshold) }];
    case "news_sentiment":
      return [{ input: "news_sentiment", op: "lt", value: 0 }];
  }
}

function requireThreshold(threshold: number | undefined): number {
  if (threshold === undefined || !Number.isFinite(threshold)) {
    throw new Error("ALERT_THRESHOLD_REQUIRED");
  }
  return threshold;
}
