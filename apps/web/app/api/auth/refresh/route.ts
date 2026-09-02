import { NextResponse } from "next/server";
import { E2E_STUB_HEADER, isAuthStub } from "@/lib/auth/mode";

export async function POST(request: Request): Promise<Response> {
  if (isAuthStub(request.headers.get(E2E_STUB_HEADER))) {
    return NextResponse.json({ ok: true });
  }
  const { createRefreshAuthRouter } = await import("@insforge/sdk/ssr");
  const { POST: refresh } = createRefreshAuthRouter();
  return refresh(request);
}
