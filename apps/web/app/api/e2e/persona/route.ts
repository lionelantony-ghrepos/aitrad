import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { rulesAdminRoleSchema } from "@meridian/schemas";
import { isAuthStub, STUB_USER_COOKIE } from "@/lib/auth/mode";
import { stubGetUser, stubPatchProfile } from "@/lib/auth/stub-store";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAuthStub()) {
    return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 404 });
  }
  const userId = (await cookies()).get(STUB_USER_COOKIE)?.value;
  if (!userId || !stubGetUser(userId)) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const raw: unknown = await request.json().catch(() => ({}));
  const persona =
    raw && typeof raw === "object" && "persona" in raw
      ? rulesAdminRoleSchema.safeParse((raw as { persona: unknown }).persona)
      : { success: false as const };
  if (!persona.success) {
    return NextResponse.json({ error: "INVALID_PERSONA" }, { status: 400 });
  }
  stubPatchProfile(userId, { persona: persona.data });
  return NextResponse.json({ ok: true, persona: persona.data });
}
