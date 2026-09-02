import { NextResponse } from "next/server";
import { isAuthStub } from "@/lib/auth/mode";
import { resetStubState } from "@/lib/auth/stub-store";

export async function POST(): Promise<NextResponse> {
  if (!isAuthStub()) {
    return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 404 });
  }
  resetStubState();
  return NextResponse.json({ ok: true });
}
