import { PROFILE_READY_COOKIE, STUB_USER_COOKIE } from "./mode";

export type CookieJar = {
  set: (
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      sameSite?: "lax" | "strict" | "none";
      path?: string;
      secure?: boolean;
      maxAge?: number;
    },
  ) => void;
  delete: (name: string) => void;
};

export function writeStubSession(jar: CookieJar, userId: string): void {
  jar.set(STUB_USER_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function clearAuthCookies(jar: CookieJar): void {
  jar.delete(STUB_USER_COOKIE);
  jar.delete(PROFILE_READY_COOKIE);
}

export function writeProfileReady(jar: CookieJar, ready: boolean): void {
  if (!ready) {
    jar.delete(PROFILE_READY_COOKIE);
    return;
  }
  jar.set(PROFILE_READY_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  });
}
