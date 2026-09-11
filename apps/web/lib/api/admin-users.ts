import {
  adminUsersAssignResponseSchema,
  adminUsersListResponseSchema,
  adminUsersRequestSchema,
  type AdminUsersAssignResponse,
  type AdminUsersListResponse,
  type AdminUsersRequest,
} from "@meridian/schemas";
import { functionsUrl } from "./functions";

export function adminUsersUrl(baseUrl: string): string {
  return functionsUrl(baseUrl, "admin-users");
}

export async function invokeAdminUsers(input: {
  baseUrl: string;
  accessToken: string;
  request: AdminUsersRequest;
  fetchImpl?: typeof fetch;
}): Promise<{ status: number; body: unknown }> {
  const payload = adminUsersRequestSchema.parse(input.request);
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(adminUsersUrl(input.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json();
  return { status: response.status, body };
}

export function parseAdminUsersList(body: unknown): AdminUsersListResponse {
  return adminUsersListResponseSchema.parse(body);
}

export function parseAdminUsersAssign(body: unknown): AdminUsersAssignResponse {
  return adminUsersAssignResponseSchema.parse(body);
}
