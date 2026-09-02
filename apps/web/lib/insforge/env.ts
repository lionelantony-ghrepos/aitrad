import { publicInsforgeEnvSchema } from "@meridian/schemas";

export function readPublicInsforgeEnv(): { baseUrl: string; anonKey: string } {
  const parsed = publicInsforgeEnvSchema.parse({
    NEXT_PUBLIC_INSFORGE_URL: process.env.NEXT_PUBLIC_INSFORGE_URL,
    NEXT_PUBLIC_INSFORGE_ANON_KEY: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  });
  return {
    baseUrl: parsed.NEXT_PUBLIC_INSFORGE_URL,
    anonKey: parsed.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  };
}

export function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
}
