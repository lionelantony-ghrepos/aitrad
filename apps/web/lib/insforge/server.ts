import { cookies } from "next/headers";
import { createAuthActions, createServerClient } from "@insforge/sdk/ssr";
import { readPublicInsforgeEnv } from "./env";

export async function createInsForgeServerClient() {
  const env = readPublicInsforgeEnv();
  return createServerClient({
    baseUrl: env.baseUrl,
    anonKey: env.anonKey,
    cookies: await cookies(),
  });
}

export async function createInsForgeAuthActions() {
  const env = readPublicInsforgeEnv();
  return createAuthActions({
    baseUrl: env.baseUrl,
    anonKey: env.anonKey,
    cookies: await cookies(),
  });
}
