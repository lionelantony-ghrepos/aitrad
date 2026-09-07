import {
  evaluateDomainRequestSchema,
  evaluateDomainResponseSchema,
  type EvaluateDomainRequest,
  type EvaluateDomainResponse,
} from "@meridian/schemas";
import { functionsUrl } from "./functions";

export function rulesServiceUrl(baseUrl: string): string {
  return functionsUrl(baseUrl, "rules-service");
}

export async function invokeEvaluateDomain(input: {
  baseUrl: string;
  accessToken: string;
  request: EvaluateDomainRequest;
  fetchImpl?: typeof fetch;
}): Promise<EvaluateDomainResponse> {
  const payload = evaluateDomainRequestSchema.parse(input.request);
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(rulesServiceUrl(input.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(`RULES_SERVICE_${response.status}`);
  }
  return evaluateDomainResponseSchema.parse(body);
}
