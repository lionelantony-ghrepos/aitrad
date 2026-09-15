/**
 * Structured JSON logs for edge functions (PBI-030).
 * Fields: request_id, user_id, fn, latency_ms, outcome.
 */
import type { FunctionLog } from "../../../packages/schemas/src/index.ts";
import {
  formatFunctionLog,
  parseTelemetrySampleRate,
  requestIdFromHeaders,
  shouldSampleTelemetry,
  userIdFromAuthorization,
} from "../../../packages/rules-engine/src/index.ts";
import { persistFunctionLatencySample } from "./telemetry-persist.ts";

export type EdgeHandler = (req: Request) => Promise<Response>;

function logLine(entry: FunctionLog): void {
  console.log(formatFunctionLog(entry));
}

function withRequestId(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  headers.set("x-request-id", requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function outcomeFromStatus(status: number): FunctionLog["outcome"] {
  if (status >= 400) {
    return "error";
  }
  return "ok";
}

export function withFunctionLog(fn: string, handler: EdgeHandler): EdgeHandler {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return handler(req);
    }
    const request_id = requestIdFromHeaders(req.headers);
    const user_id = userIdFromAuthorization(req.headers.get("Authorization"));
    const started = Date.now();
    try {
      const response = await handler(req);
      const latency_ms = Date.now() - started;
      const outcome = outcomeFromStatus(response.status);
      logLine({ request_id, user_id, fn, latency_ms, outcome, status: response.status });
      const rate = parseTelemetrySampleRate(
        typeof Deno !== "undefined" ? Deno.env.get("TELEMETRY_SAMPLE_RATE") : undefined,
        1,
      );
      if (shouldSampleTelemetry(request_id, rate)) {
        void persistFunctionLatencySample({
          fn,
          request_id,
          user_id,
          latency_ms,
          outcome,
          status: response.status,
        });
      }
      return withRequestId(response, request_id);
    } catch (error) {
      const latency_ms = Date.now() - started;
      logLine({ request_id, user_id, fn, latency_ms, outcome: "throw" });
      void persistFunctionLatencySample({
        fn,
        request_id,
        user_id,
        latency_ms,
        outcome: "throw",
      });
      throw error;
    }
  };
}
