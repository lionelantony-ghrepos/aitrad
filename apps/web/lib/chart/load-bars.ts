import { authorize } from "@meridian/rules-engine";
import {
  chartBarsQuerySchema,
  chartBarsResponseSchema,
  type ChartBarsQuery,
  type ChartBarsResponse,
} from "@meridian/schemas";
import { createRecordsClient } from "@/lib/api/client";
import { createInstrumentsRepository } from "@/lib/api/instruments";
import { createMarketBarsRepository } from "@/lib/api/market-bars";
import { isAuthStub } from "@/lib/auth/mode";
import { stubInstrumentBySymbol, stubMarketBars } from "@/lib/auth/stub-store";
import { readPublicInsforgeEnv } from "@/lib/insforge/env";
import { timeframeForRange, tsCutoffIso } from "./range";

export type LoadChartBarsResult =
  { ok: true; data: ChartBarsResponse } | { ok: false; status: number; message: string };

export async function loadChartBars(input: {
  userId: string | null;
  token: string | null;
  query: ChartBarsQuery;
  signal?: AbortSignal;
  now?: Date;
}): Promise<LoadChartBarsResult> {
  const parsed = chartBarsQuerySchema.safeParse(input.query);
  if (!parsed.success) {
    return { ok: false, status: 400, message: "Invalid chart query." };
  }
  const gate = authorize({ userId: input.userId, action: "chart:bars" });
  if (!gate.allowed) {
    return { ok: false, status: 401, message: "You must be signed in." };
  }

  const symbol = parsed.data.symbol.trim().toUpperCase();
  const range = parsed.data.range;
  const timeframe = timeframeForRange(range);
  const tsGte = tsCutoffIso(range, input.now ?? new Date());

  if (isAuthStub()) {
    const instrument = stubInstrumentBySymbol(symbol);
    if (!instrument) {
      return {
        ok: true,
        data: chartBarsResponseSchema.parse({
          symbol,
          instrument_id: "00000000-0000-4000-8000-000000000000",
          range,
          timeframe,
          bars: [],
        }),
      };
    }
    const bars = stubMarketBars(instrument.id, timeframe, tsGte);
    return {
      ok: true,
      data: chartBarsResponseSchema.parse({
        symbol: instrument.symbol,
        instrument_id: instrument.id,
        range,
        timeframe,
        bars,
      }),
    };
  }

  if (!input.token) {
    return { ok: false, status: 401, message: "You must be signed in." };
  }

  const env = readPublicInsforgeEnv();
  const client = createRecordsClient({
    baseUrl: env.baseUrl,
    getAccessToken: () => input.token as string,
  });
  const instruments = await createInstrumentsRepository(client).list({ symbol });
  const instrument = instruments[0];
  if (!instrument) {
    return {
      ok: true,
      data: chartBarsResponseSchema.parse({
        symbol,
        instrument_id: "00000000-0000-4000-8000-000000000000",
        range,
        timeframe,
        bars: [],
      }),
    };
  }

  const bars = await createMarketBarsRepository(client).listByInstrument(instrument.id, timeframe, {
    tsGte,
    signal: input.signal,
    limit: 5000,
  });
  const ordered = [...bars].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));

  return {
    ok: true,
    data: chartBarsResponseSchema.parse({
      symbol: instrument.symbol,
      instrument_id: instrument.id,
      range,
      timeframe,
      bars: ordered,
    }),
  };
}
