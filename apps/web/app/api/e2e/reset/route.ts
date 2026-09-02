import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { E2E_STUB_HEADER, isAuthStub } from "@/lib/auth/mode";
import { resetStubState } from "@/lib/auth/stub-store";

export async function POST(): Promise<NextResponse> {
  if (!isAuthStub((await headers()).get(E2E_STUB_HEADER))) {
    return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 404 });
  }
  resetStubState();
  return NextResponse.json({ ok: true });
}
