import { execConfigSchema, type ExecConfig } from "@meridian/schemas";

export type ExecConfigResolver = ExecConfig | ((orderId: string) => ExecConfig);

export function parseExecConfig(outcome: unknown): ExecConfig | null {
  const record = outcomeRecord(outcome);
  if (!record) {
    return null;
  }
  const parsed = execConfigSchema.safeParse(record);
  if (!parsed.success) {
    return null;
  }
  if (!Number.isFinite(parsed.data.slippage_bps)) {
    return null;
  }
  return parsed.data;
}

export function resolveExecConfig(resolver: ExecConfigResolver, orderId: string): ExecConfig {
  return typeof resolver === "function" ? resolver(orderId) : resolver;
}

/** Shares available this tick: ADV × table pct. Pct comes from DT-EXEC-01, not from this helper. */
export function liquidityCapShares(avgVolume: number, liquidityCapPctAdv: number): number {
  if (!Number.isFinite(avgVolume) || avgVolume <= 0) {
    return 0;
  }
  if (!Number.isFinite(liquidityCapPctAdv) || liquidityCapPctAdv < 0) {
    return 0;
  }
  return Math.floor((avgVolume * liquidityCapPctAdv) / 100);
}

export function outcomeRecord(outcome: unknown): Record<string, unknown> | null {
  if (Array.isArray(outcome)) {
    return Object.assign({}, ...outcome) as Record<string, unknown>;
  }
  if (outcome && typeof outcome === "object") {
    return outcome as Record<string, unknown>;
  }
  return null;
}
