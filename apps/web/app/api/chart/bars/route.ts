import { NextResponse } from "next/server";
import { chartBarsQuerySchema } from "@meridian/schemas";
import { getAccessToken, getSessionUser } from "@/lib/auth/session";
import { loadChartBars } from "@/lib/chart/load-bars";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const parsed = chartBarsQuerySchema.safeParse({
    symbol: url.searchParams.get("symbol") ?? "",
    range: url.searchParams.get("range") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid chart query." }, { status: 400 });
  }

  const user = await getSessionUser();
  const token = await getAccessToken();
  const result = await loadChartBars({
    userId: user?.id ?? null,
    token,
    query: parsed.data,
    signal: request.signal,
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
