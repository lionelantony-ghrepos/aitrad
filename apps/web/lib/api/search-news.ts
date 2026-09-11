import {
  newsSearchRequestSchema,
  newsSearchResponseSchema,
  type NewsSearchRequest,
  type NewsSearchResponse,
} from "@meridian/schemas";
import { functionsUrl } from "./functions";

export function searchNewsServiceUrl(baseUrl: string): string {
  return functionsUrl(baseUrl, "search-news");
}

export async function invokeSearchNews(input: {
  baseUrl: string;
  accessToken: string;
  request: NewsSearchRequest;
  fetchImpl?: typeof fetch;
}): Promise<NewsSearchResponse> {
  const payload = newsSearchRequestSchema.parse(input.request);
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(searchNewsServiceUrl(input.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`SEARCH_NEWS_${response.status}`);
  }
  return newsSearchResponseSchema.parse(body);
}
