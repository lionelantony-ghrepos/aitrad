import { authorize, executeProvision } from "@meridian/rules-engine";
import { provisionResultSchema, type ProvisionResult } from "@meridian/schemas";
import { isAuthStub } from "../auth/mode";
import { stubInsertAccount, stubInsertProfile, stubLoadProvision } from "../auth/stub-store";
import { readPublicInsforgeEnv } from "../insforge/env";
import { functionsUrl } from "./functions";

export async function provisionAccountForUser(input: {
  userId: string;
  accessToken: string;
}): Promise<ProvisionResult> {
  const decision = authorize({ userId: input.userId, action: "provision-account" });
  if (!decision.allowed) {
    throw new Error(decision.reason ?? "DENIED");
  }

  if (isAuthStub()) {
    return executeProvision({
      userId: input.userId,
      authorize: (userId) => authorize({ userId, action: "provision-account" }),
      load: async () => stubLoadProvision(input.userId),
      insertProfile: async () => stubInsertProfile(input.userId),
      insertAccount: async () => stubInsertAccount(input.userId),
      writeAudit: async () => undefined,
    });
  }

  const env = readPublicInsforgeEnv();
  const response = await fetch(functionsUrl(env.baseUrl, "provision-account"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    throw new Error("PROVISION_FAILED");
  }
  return provisionResultSchema.parse(payload);
}
