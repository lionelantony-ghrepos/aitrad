import {
  screenerCountResponseSchema,
  screenerRunRequestSchema,
  screenerRunResponseSchema,
  type ScreenerCountResponse,
  type ScreenerRunRequest,
  type ScreenerRunResponse,
} from "@meridian/schemas";
import { functionsUrl } from "./functions";

export function screenerServiceUrl(baseUrl: string): string {
  return functionsUrl(baseUrl, "screener");
}

export async function invokeScreenerRun(input: {
  baseUrl: string;
  accessToken: string;
  request: ScreenerRunRequest;
  fetchImpl?: typeof fetch;
}): Promise<ScreenerRunResponse | ScreenerCountResponse> {
  const payload = screenerRunRequestSchema.parse(input.request);
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(screenerServiceUrl(input.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(`SCREENER_SERVICE_${response.status}`);
  }
  if (payload.op === "count") {
    return screenerCountResponseSchema.parse(body);
  }
  return screenerRunResponseSchema.parse(body);
}
