import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthStub, STUB_USER_COOKIE } from "@/lib/auth/mode";
import { stubGetUser } from "@/lib/auth/stub-store";
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
  const userId = (await cookies()).get(STUB_USER_COOKIE)?.value;
  if (!userId || !stubGetUser(userId)) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const fired = await stubEvaluateMonitors({
    userId,
    force_position_day_pct: parsed.data.force_position_day_pct,
  });
  return NextResponse.json({ ok: true, fired: fired.length });
}
