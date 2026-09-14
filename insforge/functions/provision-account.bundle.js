// rewritten for InsForge worker (new Function — no import/export)
function createAdminClient(config) {
  const raw = config ?? {};
  const apiKey = typeof raw.apiKey === "string" ? raw.apiKey.trim() : "";
  if (!apiKey) {
    throw new Error("Missing apiKey. Pass apiKey to createAdminClient().");
  }
  const clientConfig = { ...raw };
  delete clientConfig.apiKey;
  return createClient({ ...clientConfig, accessToken: apiKey, isServerMode: true });
}
// bundled from insforge/functions/provision-account.ts

// insforge/functions/provision-account.ts
// insforge/functions/_shared/audit.ts
async function writeAuditLog(db, row) {
  const payload = { ...(row.payload ?? {}) };
  if (row.before !== void 0) {
    payload.before = row.before;
  }
  if (row.after !== void 0) {
    payload.after = row.after;
  }
  const insert = await db.from("audit_log").insert([
    {
      user_id: row.user_id ?? null,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id ?? null,
      payload,
    },
  ]);
  if (insert.error) {
    throw new Error(insert.error.message);
  }
}

// insforge/functions/provision-account.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
async function provision_account_default(req) {
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
  const cashBalance = seedCashRaw === void 0 ? Number.NaN : Number(seedCashRaw);
  if (!Number.isFinite(cashBalance)) {
    return json(500, { error: "POLICY_UNAVAILABLE" });
  }
  const client = createClient({
    baseUrl: Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL"),
    accessToken: userToken,
  });
  const { data: userData } = await client.auth.getCurrentUser();
  const userId = userData?.user?.id;
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
    const { error } = await client.database
      .from("profiles")
      .insert([{ user_id: userId, suitability_tier: null }]);
    if (error) {
      return json(500, { error: error.message });
    }
    const { data: reloaded, error: reloadErr } = await client.database
      .from("profiles")
      .select("*")
      .eq("user_id", userId);
    if (reloadErr) {
      return json(500, { error: reloadErr.message });
    }
    profile = Array.isArray(reloaded) ? (reloaded[0] ?? null) : null;
    if (!profile) {
      return json(500, { error: "PROFILE_UNAVAILABLE" });
    }
    created.profile = true;
  }
  let account = existingAccount;
  if (!account) {
    const { error } = await client.database
      .from("accounts")
      .insert([{ user_id: userId, cash_balance: cashBalance, currency: seedCurrency }]);
    if (error) {
      return json(500, { error: error.message });
    }
    const { data: reloaded, error: reloadErr } = await client.database
      .from("accounts")
      .select("*")
      .eq("user_id", userId);
    if (reloadErr) {
      return json(500, { error: reloadErr.message });
    }
    account = Array.isArray(reloaded) ? (reloaded[0] ?? null) : null;
    if (!account) {
      return json(500, { error: "ACCOUNT_UNAVAILABLE" });
    }
    created.account = true;
  }
  if (created.profile || created.account) {
    const apiKey = Deno.env.get("API_KEY") ?? Deno.env.get("INSFORGE_API_KEY");
    const baseUrl = Deno.env.get("INSFORGE_INTERNAL_URL") ?? Deno.env.get("INSFORGE_BASE_URL");
    if (!apiKey || !baseUrl) {
      return json(500, { error: "SERVICE_KEY_UNAVAILABLE" });
    }
    const admin = createAdminClient({ baseUrl, apiKey });
    await writeAuditLog(admin.database, {
      user_id: userId,
      action: "provision-account",
      entity_type: "account",
      entity_id: account.id,
      payload: { created },
      after: created,
    });
  }
  return json(200, { profile, account, created });
}

module.exports = provision_account_default;
