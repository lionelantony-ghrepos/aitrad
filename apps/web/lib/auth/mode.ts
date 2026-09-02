export const STUB_USER_COOKIE = "meridian_stub_user";
export const PROFILE_READY_COOKIE = "meridian_profile_ready";

function flagOn(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

/** True only when the server process has E2E_AUTH_STUB set. Never enable on a live project. */
export function isAuthStub(): boolean {
  return flagOn(process.env.E2E_AUTH_STUB);
}
