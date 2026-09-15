"use server";

import { authorizeUser } from "@/lib/auth/authorize-user";
import type { Brief, BriefKind, CopilotCitation } from "@meridian/schemas";
import { appendAuditLog } from "@/lib/api/audit-service";
import { invokeBriefExport, invokeBriefGenerate, invokeBriefList } from "@/lib/api/briefs";
import { createRecordsClient } from "@/lib/api/client";
import { createProfilesRepository } from "@/lib/api/profiles";
import { isAuthStub } from "@/lib/auth/mode";
import { getAccessToken, getSessionUser } from "@/lib/auth/session";
import { stubExportBriefPdf, stubGenerateBrief } from "@/lib/briefs/generate-stub";
import { stubListBriefs, stubPatchProfile } from "@/lib/auth/stub-store";
import { readPublicInsforgeEnv } from "@/lib/insforge/env";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; message: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

async function requireUser(): Promise<
  { ok: true; userId: string; token: string } | { ok: false; message: string }
> {
  const user = await getSessionUser();
  const token = await getAccessToken();
  if (!user || !token) {
    return { ok: false, message: "You must be signed in." };
  }
  return { ok: true, userId: user.id, token };
}

export async function listBriefsAction(): Promise<ActionResult<Brief[]>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = await authorizeUser({
    userId: session.userId,
    token: session.token,
    action: "copilot:chat",
  });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    return { ok: true, data: stubListBriefs(session.userId) };
  }
  const env = readPublicInsforgeEnv();
  const listed = await invokeBriefList({
    baseUrl: env.baseUrl,
    accessToken: session.token,
  });
  return { ok: true, data: listed.briefs };
}

export async function generateBriefAction(input: {
  kind: BriefKind;
  subject?: string;
}): Promise<ActionResult<{ brief: Brief; citations: CopilotCitation[] }>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = await authorizeUser({
    userId: session.userId,
    token: session.token,
    action: "copilot:chat",
  });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    const created = await stubGenerateBrief({
      userId: session.userId,
      kind: input.kind,
      subject: input.subject,
    });
    return { ok: true, data: created };
  }
  const env = readPublicInsforgeEnv();
  const created = await invokeBriefGenerate({
    baseUrl: env.baseUrl,
    accessToken: session.token,
    request: { kind: input.kind, subject: input.subject },
  });
  return { ok: true, data: created };
}

export async function exportBriefPdfAction(
  briefId: string,
): Promise<ActionResult<{ download_url: string }>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = await authorizeUser({
    userId: session.userId,
    token: session.token,
    action: "copilot:chat",
  });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  if (isAuthStub()) {
    const exported = stubExportBriefPdf(session.userId, briefId);
    if (!exported) {
      return { ok: false, message: "Brief not found." };
    }
    return { ok: true, data: { download_url: exported.download_url } };
  }
  const env = readPublicInsforgeEnv();
  const exported = await invokeBriefExport({
    baseUrl: env.baseUrl,
    accessToken: session.token,
    briefId,
  });
  return { ok: true, data: { download_url: exported.download_url } };
}

export async function setMorningBriefOptInAction(
  enabled: boolean,
): Promise<ActionResult<{ morning_brief_opt_in: boolean }>> {
  const session = await requireUser();
  if (!session.ok) {
    return session;
  }
  const gate = await authorizeUser({
    userId: session.userId,
    token: session.token,
    action: "copilot:chat",
  });
  if (!gate.allowed) {
    return { ok: false, message: "Not allowed." };
  }
  let profileId: string | null = null;
  if (isAuthStub()) {
    const profile = stubPatchProfile(session.userId, { morning_brief_opt_in: enabled });
    profileId = profile.id;
  } else {
    const env = readPublicInsforgeEnv();
    const client = createRecordsClient({
      baseUrl: env.baseUrl,
      getAccessToken: () => session.token,
    });
    const profiles = await createProfilesRepository(client).listMine();
    const profile = profiles[0];
    if (!profile) {
      return { ok: false, message: "Profile missing." };
    }
    await createProfilesRepository(client).updateById(profile.id, {
      morning_brief_opt_in: enabled,
    });
    profileId = profile.id;
  }
  await appendAuditLog({
    userId: session.userId,
    accessToken: session.token,
    action: "briefs:opt_in",
    entity_type: "profiles",
    entity_id: profileId,
    payload: { morning_brief_opt_in: enabled },
  });
  return { ok: true, data: { morning_brief_opt_in: enabled } };
}
