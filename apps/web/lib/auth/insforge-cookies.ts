import { DEFAULT_ACCESS_TOKEN_COOKIE } from "@insforge/sdk/ssr";
import { sessionUserFromAccessToken } from "./session-user";

type CookieReader = {
  get: (name: string) => { value: string } | string | undefined;
};

function cookieValue(jar: CookieReader, name: string): string | null {
  const raw = jar.get(name);
  if (typeof raw === "string") {
    return raw || null;
  }
  return raw?.value || null;
}

/** Only accept a trader JWT. Dashboard admin tokens share this cookie name on localhost. */
export function readAccessTokenFromJar(jar: CookieReader): string | null {
  const token = cookieValue(jar, DEFAULT_ACCESS_TOKEN_COOKIE);
  if (!token || !sessionUserFromAccessToken(token)) {
    return null;
  }
  return token;
}

export function isTraderAccessToken(token: string | undefined | null): boolean {
  return Boolean(token && sessionUserFromAccessToken(token));
}
