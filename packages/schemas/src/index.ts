import { z } from "zod";

export const packageName = "@meridian/schemas" as const;

/** Public browser env for the Next.js app. Admin keys must never use this schema. */
export const publicInsforgeEnvSchema = z.object({
  NEXT_PUBLIC_INSFORGE_URL: z.string().url(),
  NEXT_PUBLIC_INSFORGE_ANON_KEY: z.string().min(1),
});

export type PublicInsforgeEnv = z.infer<typeof publicInsforgeEnvSchema>;

/** Admin seed script (PBI-005). Never expose the API key to the browser. */
export const seedEnvSchema = z.object({
  INSFORGE_URL: z.string().url(),
  INSFORGE_API_KEY: z.string().min(1),
});

export type SeedEnv = z.infer<typeof seedEnvSchema>;

export * from "./primitives";
export * from "./entities";
export * from "./workspace-layout";
export * from "./command-recents";
export * from "./chart";
export * from "./auth";
export * from "./decision-table";
export * from "./rules-service";
export * from "./rules-admin";
