export const STUB_USER_COOKIE = "meridian_stub_user";
export const PROFILE_READY_COOKIE = "meridian_profile_ready";
export const E2E_STUB_HEADER = "x-meridian-e2e";

function flagOn(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

export function isAuthStub(headerValue?: string | null): boolean {
  const env = process.env;
  if (flagOn(env["E2E_AUTH_STUB"]) || flagOn(env["NEXT_PUBLIC_E2E_AUTH_STUB"])) {
    return true;
  }
  return headerValue === "1";
}
