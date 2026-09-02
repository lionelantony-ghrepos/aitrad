import { z } from "zod";

export const RECORDS_PATH = "/api/database/records" as const;

export const recordTables = {
  profiles: "profiles",
  accounts: "accounts",
  instruments: "instruments",
  audit_log: "audit_log",
  feature_flags: "feature_flags",
  market_bars: "market_bars",
  quotes_latest: "quotes_latest",
} as const;

export type RecordTable = (typeof recordTables)[keyof typeof recordTables];

export type QueryValue = string | number | boolean;

export function eqFilter(value: string): string {
  return `eq.${value}`;
}

export function recordsUrl(input: {
  baseUrl: string;
  table: RecordTable;
  query?: Record<string, QueryValue | undefined>;
}): string {
  const origin = input.baseUrl.replace(/\/+$/, "");
  const url = new URL(`${origin}${RECORDS_PATH}/${input.table}`);
  if (input.query) {
    for (const [key, value] of Object.entries(input.query)) {
      if (value === undefined) {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export const insforgeErrorBodySchema = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
  statusCode: z.number().optional(),
});

export class InsForgeApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(input: { status: number; message: string; code?: string }) {
    super(input.message);
    this.name = "InsForgeApiError";
    this.status = input.status;
    this.code = input.code;
  }
}
