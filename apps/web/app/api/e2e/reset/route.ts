import { NextResponse } from "next/server";
import { isAuthStub } from "@/lib/auth/mode";
import { resetStubState } from "@/lib/auth/stub-store";
import { resetStubRulesCache } from "@/lib/rules-admin/invoke";

export async function POST(): Promise<NextResponse> {
  if (!isAuthStub()) {
    return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 404 });
  }
  resetStubState();
  resetStubRulesCache();
  return NextResponse.json({ ok: true });
}
