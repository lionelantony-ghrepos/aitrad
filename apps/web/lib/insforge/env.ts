import { publicInsforgeEnvSchema } from "@meridian/schemas";

export type PublicInsforgeEnvValues = {
  baseUrl: string;
  anonKey: string;
};

export function tryReadPublicInsforgeEnv(): PublicInsforgeEnvValues | null {
  const parsed = publicInsforgeEnvSchema.safeParse({
    NEXT_PUBLIC_INSFORGE_URL: process.env.NEXT_PUBLIC_INSFORGE_URL,
    NEXT_PUBLIC_INSFORGE_ANON_KEY: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  });
  if (!parsed.success) {
    return null;
  }
  return {
    baseUrl: parsed.data.NEXT_PUBLIC_INSFORGE_URL,
    anonKey: parsed.data.NEXT_PUBLIC_INSFORGE_ANON_KEY,
  };
}

export function readPublicInsforgeEnv(): PublicInsforgeEnvValues {
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
