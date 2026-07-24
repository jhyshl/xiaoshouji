import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const DISCORD_GUILD_ID = "1291925535324110879";
const DISCORD_ROLE_ID = "1337007077264064512";
const DISCORD_API_BASE = "https://discord.com/api/v10";
const ALLOWED_ORIGINS = new Set([
  "https://jhyshl.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

type JsonRecord = Record<string, unknown>;

function readNamedKey(jsonEnvName: string, legacyEnvName: string): string {
  const namedKeys = Deno.env.get(jsonEnvName);
  if (namedKeys) {
    try {
      const parsed = JSON.parse(namedKeys) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Fall through to the legacy key while both key systems coexist.
    }
  }
  return Deno.env.get(legacyEnvName) ?? "";
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin || "https://jhyshl.github.io",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
}

function json(
  origin: string,
  status: number,
  body: JsonRecord,
  extraHeaders: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), ...extraHeaders },
  });
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = await response.json() as {
      message?: string;
      msg?: string;
      error_description?: string;
    };
    return payload.message || payload.msg || payload.error_description || "";
  } catch {
    return "";
  }
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("Origin") ?? "";

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json(origin, 403, { ok: false, code: "origin_not_allowed" });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return json(origin, 405, { ok: false, code: "method_not_allowed" });
  }

  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return json(origin, 401, { ok: false, code: "supabase_session_required" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey = readNamedKey(
    "SUPABASE_PUBLISHABLE_KEYS",
    "SUPABASE_ANON_KEY",
  );
  const secretKey = readNamedKey(
    "SUPABASE_SECRET_KEYS",
    "SUPABASE_SERVICE_ROLE_KEY",
  );

  if (!supabaseUrl || !publishableKey || !secretKey) {
    console.error("Missing Supabase function environment configuration.");
    return json(origin, 500, { ok: false, code: "server_not_configured" });
  }

  let providerToken = "";
  try {
    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > 8192) {
      return json(origin, 413, { ok: false, code: "request_too_large" });
    }
    const body = await request.json() as { providerToken?: unknown };
    if (typeof body.providerToken === "string") {
      providerToken = body.providerToken.trim();
    }
  } catch {
    return json(origin, 400, { ok: false, code: "invalid_json" });
  }

  if (!providerToken || providerToken.length > 4096) {
    return json(origin, 400, {
      ok: false,
      code: "discord_provider_token_required",
    });
  }

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: authorization,
    },
  });

  if (!authResponse.ok) {
    return json(origin, 401, { ok: false, code: "supabase_session_invalid" });
  }

  const authUser = await authResponse.json() as { id?: string };
  if (!authUser.id) {
    return json(origin, 401, { ok: false, code: "supabase_session_invalid" });
  }

  const memberResponse = await fetch(
    `${DISCORD_API_BASE}/users/@me/guilds/${DISCORD_GUILD_ID}/member`,
    {
      headers: {
        Authorization: `Bearer ${providerToken}`,
        Accept: "application/json",
      },
    },
  );

  if (memberResponse.status === 401 || memberResponse.status === 403) {
    return json(origin, 401, {
      ok: false,
      code: "discord_reauthorization_required",
    });
  }

  if (memberResponse.status === 404) {
    return json(origin, 403, {
      ok: false,
      code: "discord_guild_membership_required",
    });
  }

  if (memberResponse.status === 429) {
    const retryAfter = memberResponse.headers.get("Retry-After") ?? "5";
    return json(
      origin,
      503,
      { ok: false, code: "discord_rate_limited" },
      { "Retry-After": retryAfter },
    );
  }

  if (!memberResponse.ok) {
    console.error(
      "Discord member lookup failed:",
      memberResponse.status,
      await readError(memberResponse),
    );
    return json(origin, 502, {
      ok: false,
      code: "discord_verification_unavailable",
    });
  }

  const member = await memberResponse.json() as {
    roles?: string[];
    user?: {
      id?: string;
      username?: string;
      global_name?: string | null;
      avatar?: string | null;
    };
  };
  const roles = Array.isArray(member.roles)
    ? member.roles.filter((role): role is string => typeof role === "string")
    : [];

  if (!roles.includes(DISCORD_ROLE_ID)) {
    return json(origin, 403, {
      ok: false,
      code: "discord_required_role_missing",
    });
  }

  const discordUser = member.user;
  if (!discordUser?.id || !discordUser.username) {
    return json(origin, 502, {
      ok: false,
      code: "discord_identity_missing",
    });
  }

  const displayName = (
    discordUser.global_name ||
    discordUser.username
  ).slice(0, 80);
  const avatarUrl = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=256`
    : null;

  const finalizeResponse = await fetch(
    `${supabaseUrl}/rest/v1/rpc/complete_discord_verification`,
    {
      method: "POST",
      headers: {
        apikey: secretKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_user_id: authUser.id,
        p_discord_user_id: discordUser.id,
        p_discord_username: displayName,
        p_discord_avatar_url: avatarUrl,
        p_discord_role_ids: roles,
      }),
    },
  );

  if (!finalizeResponse.ok) {
    console.error(
      "Discord verification finalization failed:",
      finalizeResponse.status,
      await readError(finalizeResponse),
    );
    return json(origin, 500, {
      ok: false,
      code: "verification_persistence_failed",
    });
  }

  const result = await finalizeResponse.json() as {
    ok?: boolean;
    status?: string;
    reason?: string | null;
    membership_valid_until?: string;
    active_users?: number;
    max_active_users?: number;
  };

  if (!result.ok) {
    const status = result.reason === "capacity_full" ? 409 : 403;
    return json(origin, status, {
      ok: false,
      code: result.reason || "account_not_active",
      accountStatus: result.status || "pending",
      activeUsers: result.active_users,
      maxActiveUsers: result.max_active_users,
    });
  }

  return json(origin, 200, {
    ok: true,
    accountStatus: result.status,
    membershipValidUntil: result.membership_valid_until,
    activeUsers: result.active_users,
    maxActiveUsers: result.max_active_users,
    discordUser: {
      id: discordUser.id,
      username: displayName,
      avatarUrl,
    },
  });
});
