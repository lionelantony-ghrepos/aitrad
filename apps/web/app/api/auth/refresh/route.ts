import { NextResponse } from "next/server";
import { isAuthStub } from "@/lib/auth/mode";

export async function POST(request: Request): Promise<Response> {
  if (isAuthStub()) {
    return NextResponse.json({ ok: true });
  }
  const { createRefreshAuthRouter } = await import("@insforge/sdk/ssr");
  const { POST: refresh } = createRefreshAuthRouter();
  return refresh(request);
}
