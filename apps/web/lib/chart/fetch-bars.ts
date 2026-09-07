import {
  chartBarsQuerySchema,
  chartBarsResponseSchema,
  type ChartBarsQuery,
} from "@meridian/schemas";

export async function fetchChartBars(
  query: ChartBarsQuery,
  signal?: AbortSignal,
): Promise<
  | { ok: true; data: ReturnType<typeof chartBarsResponseSchema.parse> }
  | { ok: false; message: string }
> {
  const parsed = chartBarsQuerySchema.parse(query);
  const params = new URLSearchParams({ symbol: parsed.symbol, range: parsed.range });
  let response: Response;
  try {
    response = await fetch(`/api/chart/bars?${params.toString()}`, { signal });
  } catch (error) {
    if (signal?.aborted) {
      return { ok: false, message: "aborted" };
    }
    const message = error instanceof Error ? error.message : "Chart request failed.";
    return { ok: false, message };
  }
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : "Chart request failed.";
    return { ok: false, message };
  }
  return { ok: true, data: chartBarsResponseSchema.parse(payload) };
}
