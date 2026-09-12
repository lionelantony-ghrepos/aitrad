import { z } from "zod";
import { rulesAdminRoleSchema } from "./rules-admin";
import { uuidSchema } from "./primitives";

export const userRoleSchema = rulesAdminRoleSchema;

export const adminUsersOpSchema = z.enum(["list", "assign"]);

export const adminUserRowSchema = z.object({
  user_id: uuidSchema,
  email: z.string().email().nullable().optional(),
  display_name: z.string().nullable().optional(),
  role: userRoleSchema,
});

export const adminUsersListRequestSchema = z.object({
  op: z.literal("list"),
});

export const adminUsersAssignRequestSchema = z.object({
  op: z.literal("assign"),
  user_id: uuidSchema,
  role: userRoleSchema,
});

export const adminUsersRequestSchema = z.discriminatedUnion("op", [
  adminUsersListRequestSchema,
  adminUsersAssignRequestSchema,
]);

export const adminUsersListResponseSchema = z.object({
  users: z.array(adminUserRowSchema),
});

export const adminUsersAssignResponseSchema = z.object({
  ok: z.literal(true),
  user_id: uuidSchema,
  role: userRoleSchema,
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type AdminUsersOp = z.infer<typeof adminUsersOpSchema>;
export type AdminUserRow = z.infer<typeof adminUserRowSchema>;
export type AdminUsersRequest = z.infer<typeof adminUsersRequestSchema>;
export type AdminUsersListResponse = z.infer<typeof adminUsersListResponseSchema>;
export type AdminUsersAssignResponse = z.infer<typeof adminUsersAssignResponseSchema>;
