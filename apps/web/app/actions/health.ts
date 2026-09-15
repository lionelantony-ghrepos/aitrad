"use server";

import { fetchHealthSnapshot, parseHealthSnapshot } from "@/lib/api/telemetry";
import { isAuthStub } from "@/lib/auth/mode";
import { loadAuthContext } from "@/lib/auth/session";
import { tryReadPublicInsforgeEnv } from "@/lib/insforge/env";
import type { HealthSnapshot } from "@meridian/schemas";

export async function healthSnapshotAction(): Promise<
  { ok: true; data: HealthSnapshot } | { ok: false; message: string; status: number }
> {
  const ctx = await loadAuthContext();
  if (!ctx) {
    return { ok: false, message: "UNAUTHENTICATED", status: 401 };
  }
  const env = tryReadPublicInsforgeEnv();
  const result = await fetchHealthSnapshot({
    userId: ctx.user.id,
    accessToken: ctx.accessToken,
    baseUrl: env?.baseUrl ?? (isAuthStub() ? "http://stub.local" : ""),
  });
  if (result.status !== 200) {
    return {
      ok: false,
      message:
        typeof result.body === "object" && result.body && "error" in result.body
          ? String((result.body as { error: unknown }).error)
          : "HEALTH_UNAVAILABLE",
      status: result.status,
    };
  }
  return { ok: true, data: parseHealthSnapshot(result.body) };
}
