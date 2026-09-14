import { NextResponse } from "next/server";
import { telemetryRequestSchema } from "@meridian/schemas";
import { ingestTelemetry } from "@/lib/api/telemetry";
import { loadAuthContext } from "@/lib/auth/session";
import { readPublicInsforgeEnv, tryReadPublicInsforgeEnv } from "@/lib/insforge/env";
import { isAuthStub } from "@/lib/auth/mode";

export async function POST(request: Request): Promise<NextResponse> {
  const ctx = await loadAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = telemetryRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_TELEMETRY" }, { status: 400 });
  }
  const env = isAuthStub() ? { baseUrl: "http://stub.local" } : tryReadPublicInsforgeEnv();
  const result = await ingestTelemetry({
    userId: ctx.user.id,
    accessToken: ctx.accessToken,
    request: parsed.data,
    baseUrl: env?.baseUrl ?? readPublicInsforgeEnv().baseUrl,
  });
  return NextResponse.json(result.body, { status: result.status });
}
