import { DEFAULT_ACCESS_TOKEN_COOKIE } from "@insforge/sdk/ssr";
import { describe, expect, it } from "vitest";
import { readAccessTokenFromJar } from "./insforge-cookies";

function jwtWithPayload(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

const USER_ID = "11111111-1111-4111-8111-111111111111";

function userJwt(): string {
  return jwtWithPayload({
    sub: USER_ID,
    email: "trader@example.com",
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

function adminJwt(): string {
  return jwtWithPayload({
    sub: "local:admin",
    role: "project_admin",
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

function jar(entries: Record<string, string>): {
  get: (name: string) => { value: string } | undefined;
} {
  return {
    get(name: string) {
      const value = entries[name];
      return value ? { value } : undefined;
    },
  };
}

describe("readAccessTokenFromJar", () => {
  it("accepts a trader JWT and ignores a dashboard admin JWT", () => {
    const user = userJwt();
    expect(readAccessTokenFromJar(jar({ [DEFAULT_ACCESS_TOKEN_COOKIE]: user }))).toBe(user);
    expect(readAccessTokenFromJar(jar({ [DEFAULT_ACCESS_TOKEN_COOKIE]: adminJwt() }))).toBeNull();
  });
});
