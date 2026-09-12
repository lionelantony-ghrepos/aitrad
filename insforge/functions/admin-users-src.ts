/**
 * Orchestration source for `admin-users`. Bundle to `admin-users.ts`.
 */
import { createAdminClient, createClient } from "npm:@insforge/sdk";
import {
  adminUserRowSchema,
  userRoleSchema,
  type AdminUserRow,
} from "../../packages/schemas/src/index.ts";
import {
  baselineTable,
  evaluate,
  handleAdminUsersRequest,
  resolveRulesServiceApiKey,
} from "../../packages/rules-engine/src/index.ts";
import { loadPublishedEntitlementsTable, loadUserRole } from "./_shared/entitlements.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return json(401, { error: "UNAUTHENTICATED" });
  }

  const baseUrl = Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL");
  if (!baseUrl) {
    return json(500, { error: "INSFORGE_URL_MISSING" });
  }

  const apiKey = resolveRulesServiceApiKey({
    API_KEY: Deno.env.get("API_KEY"),
    INSFORGE_API_KEY: Deno.env.get("INSFORGE_API_KEY"),
  });
  if (!apiKey) {
    return json(500, { error: "API_KEY_MISSING" });
  }

  const userClient = createClient({ baseUrl, accessToken: token });
  const { data: userData } = await userClient.auth.getCurrentUser();
  const userId = userData?.user?.id as string | undefined;
  if (!userId) {
    return json(401, { error: "UNAUTHENTICATED" });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const admin = createAdminClient({ baseUrl, apiKey });
  const result = await handleAdminUsersRequest({
    method: "POST",
    body,
    userId,
    isService: false,
    ports: {
      async loadRole(id) {
        return loadUserRole(admin.database, id);
      },
      async evaluateEntitlements(ctx) {
        const table =
          (await loadPublishedEntitlementsTable(admin.database)) ?? baselineTable("DT-ENT-01");
        return evaluate(table, ctx, new Date());
      },
      async listUsers() {
        const rpc = await admin.database.rpc("list_user_directory");
        if (rpc.error) {
          throw new Error(rpc.error.message);
        }
        const rows = Array.isArray(rpc.data) ? rpc.data : [];
        return rows.map((row) =>
          adminUserRowSchema.parse({
            user_id: (row as AdminUserRow).user_id,
            email: (row as { email?: string | null }).email ?? null,
            display_name: (row as { display_name?: string | null }).display_name ?? null,
            role: userRoleSchema.parse((row as { role?: string }).role ?? "trader"),
          }),
        );
      },
      async assignRole(id, role) {
        const existing = await admin.database
          .from("user_roles")
          .select("user_id")
          .eq("user_id", id);
        if (existing.error) {
          throw new Error(existing.error.message);
        }
        const has = Array.isArray(existing.data) && existing.data.length > 0;
        if (has) {
          const updated = await admin.database
            .from("user_roles")
            .update({ role })
            .eq("user_id", id);
          if (updated.error) {
            throw new Error(updated.error.message);
          }
          return;
        }
        const inserted = await admin.database.from("user_roles").insert([{ user_id: id, role }]);
        if (inserted.error) {
          throw new Error(inserted.error.message);
        }
      },
      async writeAuditLog(row) {
        const insert = await admin.database.from("audit_log").insert([
          {
            user_id: row.user_id,
            action: row.action,
            entity_type: row.entity_type,
            entity_id: row.entity_id ?? null,
            payload: row.payload,
          },
        ]);
        if (insert.error) {
          throw new Error(insert.error.message);
        }
      },
    },
  });

  return json(result.status, result.body);
}
