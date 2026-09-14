import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthStub } from "@/lib/auth/mode";
import { getSessionUser } from "@/lib/auth/session";
import { stubEvaluateMonitors } from "@/lib/monitors/evaluate-stub";

const bodySchema = z
  .object({
    force_position_day_pct: z.number().optional(),
  })
  .strict();

export async function POST(req: Request): Promise<NextResponse> {
  if (!isAuthStub()) {
    return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 404 });
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const fired = await stubEvaluateMonitors({
    userId: user.id,
    force_position_day_pct: parsed.data.force_position_day_pct,
  });
  return NextResponse.json({ ok: true, fired: fired.length });
}
