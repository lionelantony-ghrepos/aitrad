import { sessionUserSchema, type SessionUser } from "@meridian/schemas";

function decodeBase64Url(segment: string): string {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }
  return atob(padded);
}

function pickId(payload: Record<string, unknown>): unknown {
  return payload.sub ?? payload.user_id ?? payload.id;
}

function pickEmail(payload: Record<string, unknown>): unknown {
  if (typeof payload.email === "string") {
    return payload.email;
  }
  const meta = payload.user_metadata;
  if (meta && typeof meta === "object" && "email" in meta) {
    return (meta as { email?: unknown }).email;
  }
  return undefined;
}

/** Read id/email from a JWT without a network round-trip. Rejects expired tokens. */
export function sessionUserFromAccessToken(
  token: string,
  nowMs: number = Date.now(),
): SessionUser | null {
  const parts = token.split(".");
  if (parts.length < 2 || !parts[1]) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(decodeBase64Url(parts[1]));
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const payload = parsed as Record<string, unknown>;
    if (typeof payload.exp === "number" && payload.exp * 1000 <= nowMs) {
      return null;
    }
    const user = sessionUserSchema.safeParse({
      id: pickId(payload),
      email: pickEmail(payload),
    });
    return user.success ? user.data : null;
  } catch {
    return null;
  }
}
