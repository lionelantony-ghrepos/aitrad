import { createClient } from "npm:@insforge/sdk";

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

/**
 * Orchestrates profile + paper account creation. Opening cash is not computed
 * here — set InsForge secret PAPER_ACCOUNT_SEED_CASH to the same figure as
 * `@meridian/rules-engine` `paperAccountSeed()` (see that module, not this file).
 */
export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  const authHeader = req.headers.get("Authorization");
  const userToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!userToken) {
    return json(401, { error: "UNAUTHENTICATED" });
  }

  const seedCashRaw = Deno.env.get("PAPER_ACCOUNT_SEED_CASH");
  const seedCurrency = Deno.env.get("PAPER_ACCOUNT_SEED_CURRENCY") ?? "USD";
  const cashBalance = seedCashRaw === undefined ? Number.NaN : Number(seedCashRaw);
  if (!Number.isFinite(cashBalance)) {
    return json(500, { error: "POLICY_UNAVAILABLE" });
  }

  const client = createClient({
    baseUrl: Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL"),
    accessToken: userToken,
  });

  const { data: userData } = await client.auth.getCurrentUser();
  const userId = userData?.user?.id as string | undefined;
  if (!userId) {
    return json(401, { error: "UNAUTHENTICATED" });
  }

  const { data: profiles, error: profileErr } = await client.database
    .from("profiles")
    .select("*")
    .eq("user_id", userId);
  if (profileErr) {
    return json(500, { error: profileErr.message });
  }

  const { data: accounts, error: accountErr } = await client.database
    .from("accounts")
    .select("*")
    .eq("user_id", userId);
  if (accountErr) {
    return json(500, { error: accountErr.message });
  }

  const existingProfile = Array.isArray(profiles) ? profiles[0] : null;
  const existingAccount = Array.isArray(accounts) ? accounts[0] : null;
  const created = { profile: false, account: false };

  let profile = existingProfile;
  if (!profile) {
    const { data: inserted, error } = await client.database
      .from("profiles")
      .insert([{ user_id: userId, suitability_tier: null }]);
    if (error) {
      return json(500, { error: error.message });
    }
    profile = Array.isArray(inserted) ? inserted[0] : inserted;
    created.profile = true;
  }

  let account = existingAccount;
  if (!account) {
    const { data: inserted, error } = await client.database
      .from("accounts")
      .insert([{ user_id: userId, cash_balance: cashBalance, currency: seedCurrency }]);
    if (error) {
      return json(500, { error: error.message });
    }
    account = Array.isArray(inserted) ? inserted[0] : inserted;
    created.account = true;
  }

  if (created.profile || created.account) {
    await client.database.from("audit_log").insert([
      {
        user_id: userId,
        action: "provision-account",
        entity_type: "account",
        entity_id: account?.id ?? null,
        payload: { created },
      },
    ]);
  }

  return json(200, { profile, account, created });
}
