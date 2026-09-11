import { adminUsersRequestSchema, type AdminUserRow, type UserRole } from "@meridian/schemas";
import { authorize, type AuthorizePorts } from "./authorize";

export type AdminUsersPorts = AuthorizePorts & {
  listUsers: () => Promise<AdminUserRow[]>;
  assignRole: (userId: string, role: UserRole) => Promise<void>;
  writeAuditLog: (row: {
    user_id: string | null;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    payload: Record<string, unknown>;
  }) => Promise<void>;
};

export async function handleAdminUsersRequest(input: {
  method: string;
  body: unknown;
  userId: string | null;
  isService: boolean;
  ports: AdminUsersPorts;
  clock?: Date;
}): Promise<{ status: number; body: unknown }> {
  if (input.method !== "POST") {
    return { status: 405, body: { error: "METHOD_NOT_ALLOWED" } };
  }
  const parsed = adminUsersRequestSchema.safeParse(input.body);
  if (!parsed.success) {
    return { status: 400, body: { error: "INVALID_ADMIN_USERS_REQUEST" } };
  }
  if (input.isService) {
    return { status: 403, body: { error: "USER_JWT_REQUIRED" } };
  }
  if (!input.userId) {
    return { status: 401, body: { error: "UNAUTHENTICATED" } };
  }

  const action = parsed.data.op === "list" ? "users:read" : "users:assign";
  const gate = await authorize({
    userId: input.userId,
    action,
    ports: input.ports,
  });
  if (!gate.allowed) {
    return {
      status: gate.reason === "UNAUTHENTICATED" ? 401 : 403,
      body: { error: gate.reason ?? "FORBIDDEN" },
    };
  }

  if (parsed.data.op === "list") {
    const users = await input.ports.listUsers();
    await input.ports.writeAuditLog({
      user_id: input.userId,
      action: "users.list",
      entity_type: "user_roles",
      payload: { count: users.length },
    });
    return { status: 200, body: { users } };
  }

  await input.ports.assignRole(parsed.data.user_id, parsed.data.role);
  await input.ports.writeAuditLog({
    user_id: input.userId,
    action: "users.assign",
    entity_type: "user_roles",
    entity_id: parsed.data.user_id,
    payload: { role: parsed.data.role },
  });
  return {
    status: 200,
    body: { ok: true as const, user_id: parsed.data.user_id, role: parsed.data.role },
  };
}
