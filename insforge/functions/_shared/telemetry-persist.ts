import { createAdminClient } from "npm:@insforge/sdk";
import { resolveRulesServiceApiKey } from "../../../packages/rules-engine/src/index.ts";

export async function persistFunctionLatencySample(input: {
  fn: string;
  request_id: string;
  user_id: string | null;
  latency_ms: number;
  outcome: string;
  status?: number;
}): Promise<void> {
  try {
    const apiKey = resolveRulesServiceApiKey({
      API_KEY: Deno.env.get("API_KEY"),
      INSFORGE_API_KEY: Deno.env.get("INSFORGE_API_KEY"),
    });
    const baseUrl = Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL");
    if (!apiKey || !baseUrl) {
      return;
    }
    const admin = createAdminClient({ baseUrl, apiKey });
    await admin.database.from("telemetry").insert([
      {
        kind: "fn_latency",
        fn: input.fn,
        request_id: input.request_id,
        user_id: input.user_id,
        latency_ms: input.latency_ms,
        outcome: input.outcome,
        payload: { status: input.status ?? null },
      },
    ]);
  } catch {
    // logging must never fail the request
  }
}
