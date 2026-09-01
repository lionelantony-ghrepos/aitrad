import { z } from "zod";

export const packageName = "@meridian/schemas" as const;

/** Public browser env for the Next.js app. Admin keys must never use this schema. */
export const publicInsforgeEnvSchema = z.object({
  NEXT_PUBLIC_INSFORGE_URL: z.string().url(),
  NEXT_PUBLIC_INSFORGE_ANON_KEY: z.string().min(1),
});

export type PublicInsforgeEnv = z.infer<typeof publicInsforgeEnvSchema>;
