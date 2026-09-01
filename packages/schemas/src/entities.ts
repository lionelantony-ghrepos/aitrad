import { z } from "zod";
import { numericSchema, timestamptzSchema, uuidSchema } from "./primitives";

export const experienceLevelSchema = z.enum(["novice", "intermediate", "advanced"]);

export const suitabilityTierSchema = z.enum(["conservative", "standard", "full"]);

export const profileSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  display_name: z.string().nullable(),
  persona: z.string().nullable(),
  experience_level: experienceLevelSchema.nullable(),
  suitability_tier: suitabilityTierSchema.nullable(),
  objectives: z.string().nullable(),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});

export const profileInsertSchema = z.object({
  user_id: uuidSchema,
  display_name: z.string().nullable().optional(),
  persona: z.string().nullable().optional(),
  experience_level: experienceLevelSchema.nullable().optional(),
  suitability_tier: suitabilityTierSchema.nullable().optional(),
  objectives: z.string().nullable().optional(),
});

export const profilePatchSchema = profileInsertSchema.omit({ user_id: true }).partial();

export type Profile = z.infer<typeof profileSchema>;
export type ProfileInsert = z.infer<typeof profileInsertSchema>;
export type ProfilePatch = z.infer<typeof profilePatchSchema>;

export const accountSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  cash_balance: numericSchema,
  currency: z.string().min(1),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});

export const accountInsertSchema = z.object({
  user_id: uuidSchema,
  cash_balance: numericSchema.optional(),
  currency: z.string().min(1).optional(),
});

export const accountPatchSchema = z.object({
  cash_balance: numericSchema.optional(),
  currency: z.string().min(1).optional(),
});

export type Account = z.infer<typeof accountSchema>;
export type AccountInsert = z.infer<typeof accountInsertSchema>;
export type AccountPatch = z.infer<typeof accountPatchSchema>;

export const instrumentStatusSchema = z.enum(["active", "halted", "delisted"]);

export const instrumentSchema = z.object({
  id: uuidSchema,
  symbol: z.string().min(1),
  name: z.string().min(1),
  exchange: z.string().min(1),
  sector: z.string().nullable(),
  industry: z.string().nullable(),
  status: instrumentStatusSchema,
  currency: z.string().min(1),
  tick_size: numericSchema,
  lot_size: z.coerce.number().int(),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});

export type Instrument = z.infer<typeof instrumentSchema>;

export const auditLogSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema.nullable(),
  action: z.string().min(1),
  entity_type: z.string().min(1),
  entity_id: uuidSchema.nullable(),
  payload: z.record(z.unknown()),
  created_at: timestamptzSchema,
});

export const auditLogInsertSchema = z.object({
  user_id: uuidSchema,
  action: z.string().min(1),
  entity_type: z.string().min(1),
  entity_id: uuidSchema.nullable().optional(),
  payload: z.record(z.unknown()).optional(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;
export type AuditLogInsert = z.infer<typeof auditLogInsertSchema>;

export const featureFlagSchema = z.object({
  id: uuidSchema,
  key: z.string().min(1),
  value: z.unknown(),
  user_id: uuidSchema.nullable(),
  created_at: timestamptzSchema,
  updated_at: timestamptzSchema,
});

export const featureFlagInsertSchema = z.object({
  key: z.string().min(1),
  value: z.unknown().optional(),
  user_id: uuidSchema,
});

export type FeatureFlag = z.infer<typeof featureFlagSchema>;
export type FeatureFlagInsert = z.infer<typeof featureFlagInsertSchema>;
