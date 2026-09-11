import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { matchTickSchema } from "@meridian/schemas";
import { z } from "zod";
import { isAuthStub, STUB_USER_COOKIE } from "@/lib/auth/mode";
import { stubApplyTicks } from "@/lib/orders/stub-matching";
import { stubGetUser } from "@/lib/auth/stub-store";

const bodySchema = z.object({
  ticks: z.array(matchTickSchema).min(1),
});

export async function POST(req: Request): Promise<NextResponse> {
  if (!isAuthStub()) {
    return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 404 });
  }
  const userId = (await cookies()).get(STUB_USER_COOKIE)?.value;
  if (!userId || !stubGetUser(userId)) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_TICKS" }, { status: 400 });
  }
  const orders = stubApplyTicks(userId, parsed.data.ticks);
  return NextResponse.json({ ok: true, orders });
}
