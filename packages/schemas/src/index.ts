import { z } from "zod";

export const packageName = "@meridian/schemas" as const;

/** Public browser env for the Next.js app. Admin keys must never use this schema. */
export const publicInsforgeEnvSchema = z.object({
  NEXT_PUBLIC_INSFORGE_URL: z.string().url(),
  NEXT_PUBLIC_INSFORGE_ANON_KEY: z.string().min(1),
});

export type PublicInsforgeEnv = z.infer<typeof publicInsforgeEnvSchema>;

export { numericSchema, timestamptzSchema, uuidSchema } from "./primitives";

export {
  accountInsertSchema,
  accountPatchSchema,
  accountSchema,
  auditLogInsertSchema,
  auditLogSchema,
  experienceLevelSchema,
  featureFlagInsertSchema,
  featureFlagSchema,
  instrumentSchema,
  instrumentStatusSchema,
  profileInsertSchema,
  profilePatchSchema,
  profileSchema,
  suitabilityTierSchema,
  type Account,
  type AccountInsert,
  type AccountPatch,
  type AuditLog,
  type AuditLogInsert,
  type FeatureFlag,
  type FeatureFlagInsert,
  type Instrument,
  type Profile,
  type ProfileInsert,
  type ProfilePatch,
} from "./entities";
