import { z } from "zod";
import { accountSchema, experienceLevelSchema, profileSchema } from "./entities";
import { uuidSchema } from "./primitives";

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export const profileWizardSchema = z.object({
  display_name: z.string().trim().min(1).max(120),
  experience_level: experienceLevelSchema,
  objectives: z.string().trim().max(2000).optional(),
});

export type ProfileWizardInput = z.infer<typeof profileWizardSchema>;

export const sessionUserSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

export const provisionCreatedSchema = z.object({
  profile: z.boolean(),
  account: z.boolean(),
});

export const provisionResultSchema = z.object({
  profile: profileSchema,
  account: accountSchema,
  created: provisionCreatedSchema,
});

export type ProvisionResult = z.infer<typeof provisionResultSchema>;
