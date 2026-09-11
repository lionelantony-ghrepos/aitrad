import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAuthStub, STUB_USER_COOKIE } from "@/lib/auth/mode";
import { stubArmForceOrderReject, stubGetUser } from "@/lib/auth/stub-store";

export async function POST(): Promise<NextResponse> {
  if (!isAuthStub()) {
    return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 404 });
  }
  const userId = (await cookies()).get(STUB_USER_COOKIE)?.value;
  if (!userId || !stubGetUser(userId)) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  stubArmForceOrderReject(userId);
  return NextResponse.json({ ok: true });
}
