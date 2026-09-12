import { cookies } from "next/headers";
import { createAuthActions, createServerClient } from "@insforge/sdk/ssr";
import { readAccessTokenFromJar } from "@/lib/auth/insforge-cookies";
import { readPublicInsforgeEnv } from "./env";

export async function createInsForgeServerClient() {
  const env = readPublicInsforgeEnv();
  const jar = await cookies();
  return createServerClient({
    baseUrl: env.baseUrl,
    anonKey: env.anonKey,
    cookies: jar,
    accessToken: readAccessTokenFromJar(jar) ?? undefined,
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
