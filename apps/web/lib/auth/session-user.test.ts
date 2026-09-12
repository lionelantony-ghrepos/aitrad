import { describe, expect, it } from "vitest";
import { sessionUserFromAccessToken } from "./session-user";

function jwtWithPayload(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("sessionUserFromAccessToken", () => {
  it("reads sub and email from a live JWT", () => {
    const token = jwtWithPayload({
      sub: USER_ID,
      email: "trader@example.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(sessionUserFromAccessToken(token)).toEqual({
      id: USER_ID,
      email: "trader@example.com",
    });
  });

  it("reads email from user_metadata when top-level email is absent", () => {
    const token = jwtWithPayload({
      sub: USER_ID,
      user_metadata: { email: "nested@example.com" },
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(sessionUserFromAccessToken(token)?.email).toBe("nested@example.com");
  });

  it("rejects expired tokens", () => {
    const token = jwtWithPayload({
      sub: USER_ID,
      email: "trader@example.com",
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    expect(sessionUserFromAccessToken(token)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(sessionUserFromAccessToken("not-a-jwt")).toBeNull();
  });

  it("rejects project-admin tokens that are not a user UUID", () => {
    const token = jwtWithPayload({
      sub: "local:admin",
      email: "admin@local",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(sessionUserFromAccessToken(token)).toBeNull();
  });
});
