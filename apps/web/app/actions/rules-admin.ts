"use server";

import {
  evaluateDomainRequestSchema,
  rulesAdminRequestSchema,
  type EvaluateDomainRequest,
  type RulesAdminRequest,
} from "@meridian/schemas";
import { isAuthStub } from "@/lib/auth/mode";
import { loadAuthContext } from "@/lib/auth/session";
import { tryReadPublicInsforgeEnv } from "@/lib/insforge/env";
import {
  invokeEvaluateStub,
  invokeRulesAdminRemote,
  invokeRulesAdminStub,
} from "@/lib/rules-admin/invoke";
import { invokeEvaluateDomain } from "@/lib/api/rules-service";

export async function rulesAdminAction(
  request: RulesAdminRequest,
): Promise<{ status: number; body: unknown }> {
  const parsed = rulesAdminRequestSchema.parse(request);
  const ctx = await loadAuthContext();
  if (!ctx) {
    return { status: 401, body: { error: "UNAUTHENTICATED" } };
  }
  if (isAuthStub()) {
    return invokeRulesAdminStub({
      userId: ctx.user.id,
      role: ctx.role,
      request: parsed,
    });
  }
  const env = tryReadPublicInsforgeEnv();
  if (!env) {
    return { status: 500, body: { error: "INSFORGE_UNAVAILABLE" } };
  }
  return invokeRulesAdminRemote({
    baseUrl: env.baseUrl,
    accessToken: ctx.accessToken,
    request: parsed,
  });
}

export async function rulesEvaluateAction(request: EvaluateDomainRequest): Promise<{
  status: number;
  body: unknown;
}> {
  const parsed = evaluateDomainRequestSchema.parse(request);
  const ctx = await loadAuthContext();
  if (!ctx) {
    return { status: 401, body: { error: "UNAUTHENTICATED" } };
  }
  if (isAuthStub()) {
    try {
      const body = await invokeEvaluateStub({
        userId: ctx.user.id,
        role: ctx.role,
        request: parsed,
      });
      return { status: 200, body };
    } catch {
      return { status: 403, body: { error: "FORBIDDEN" } };
    }
  }
  const env = tryReadPublicInsforgeEnv();
  if (!env) {
    return { status: 500, body: { error: "INSFORGE_UNAVAILABLE" } };
  }
  try {
    const body = await invokeEvaluateDomain({
      baseUrl: env.baseUrl,
      accessToken: ctx.accessToken,
      request: parsed,
    });
    return { status: 200, body };
  } catch {
    return { status: 502, body: { error: "RULES_SERVICE_FAILED" } };
  }
}
