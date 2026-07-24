import { computed, reactive } from "vue";
import {
  appRedirectUrl,
  supabase,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "./supabase.js";

const PROFILE_FIELDS = [
  "user_id",
  "display_name",
  "avatar_url",
  "status",
  "discord_user_id",
  "discord_username",
  "discord_avatar_url",
  "discord_guild_verified_at",
  "membership_valid_until",
  "created_at",
  "updated_at",
].join(",");

const ERROR_MESSAGES = {
  account_not_active: "此账户目前不能进入小手机。",
  capacity_full: "当前开放名额已满，请联系管理员增加名额或释放席位。",
  discord_guild_membership_required: "这个 Discord 账号不在指定社区中。",
  discord_identity_missing: "没有读取到 Discord 身份，请重新授权。",
  discord_provider_token_required: "Discord 授权已过期，请重新验证。",
  discord_rate_limited: "Discord 请求过于频繁，请稍后再试。",
  discord_reauthorization_required: "Discord 授权已过期，请重新验证。",
  discord_required_role_missing: "你还没有获得指定的 Discord 身份组。",
  discord_verification_unavailable: "暂时无法连接 Discord，请稍后再试。",
  origin_not_allowed: "当前网页地址不在允许列表中。",
  registration_closed: "小手机目前暂停开放新用户。",
  server_not_configured: "登录服务尚未配置完成。",
  supabase_session_invalid: "登录会话已过期，请重新登录。",
  supabase_session_required: "请先使用 Discord 登录。",
  suspended: "此账户已被暂停，请联系管理员。",
  verification_persistence_failed: "身份验证成功，但账户资料保存失败。",
};

export const authState = reactive({
  initialized: false,
  busy: false,
  verifying: false,
  session: null,
  user: null,
  profile: null,
  errorCode: "",
  errorMessage: "",
});

export const hasActiveAccess = computed(() => {
  if (!authState.user || authState.profile?.status !== "active") return false;
  const validUntil = Date.parse(authState.profile.membership_valid_until || "");
  return Number.isFinite(validUntil) && validUntil > Date.now();
});

export const needsDiscordVerification = computed(
  () => Boolean(authState.user) && !hasActiveAccess.value,
);

let authSubscription = null;
let sessionSync = Promise.resolve();
let verifiedProviderToken = "";

function setError(code, fallback = "") {
  authState.errorCode = code || "";
  authState.errorMessage =
    ERROR_MESSAGES[code] || fallback || "登录验证失败，请稍后再试。";
}

function clearError() {
  authState.errorCode = "";
  authState.errorMessage = "";
}

async function loadProfile(userId) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select(PROFILE_FIELDS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  authState.profile = data;
  return data;
}

async function callDiscordVerification(providerToken) {
  const session = authState.session;
  if (!session?.access_token) throw new Error("supabase_session_required");

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/verify-discord-membership`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ providerToken }),
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.code || "account_not_active");
    error.code = payload.code;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export async function verifyDiscordAccess(providerToken) {
  if (!providerToken || authState.verifying) return false;
  authState.verifying = true;
  clearError();
  try {
    await callDiscordVerification(providerToken);
    await loadProfile(authState.user.id);
    verifiedProviderToken = providerToken;
    return hasActiveAccess.value;
  } catch (error) {
    await loadProfile(authState.user.id).catch(() => null);
    setError(error.code || error.message, error.message);
    return false;
  } finally {
    authState.verifying = false;
  }
}

async function applySession(session) {
  authState.session = session;
  authState.user = session?.user || null;
  authState.profile = null;
  clearError();

  if (!session?.user) return;

  if (
    session.provider_token &&
    session.provider_token !== verifiedProviderToken
  ) {
    await verifyDiscordAccess(session.provider_token);
    return;
  }

  try {
    await loadProfile(session.user.id);
  } catch (error) {
    setError("profile_load_failed", error.message);
  }
}

function queueSession(session) {
  sessionSync = sessionSync
    .catch((error) => {
      console.warn("Previous auth session update failed", error);
    })
    .then(() => applySession(session));
  return sessionSync;
}

export async function initializeAuth() {
  if (authState.initialized) return;
  authState.busy = true;
  clearError();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => queueSession(session), 0);
  });
  authSubscription = subscription;

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    await queueSession(data.session);
  } catch (error) {
    setError("session_load_failed", error.message);
  } finally {
    authState.busy = false;
    authState.initialized = true;
  }
}

export async function signInWithDiscord() {
  authState.busy = true;
  clearError();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: appRedirectUrl(),
      scopes: "guilds guilds.members.read",
    },
  });
  if (error) {
    authState.busy = false;
    setError("discord_login_failed", error.message);
  }
}

export async function signOut() {
  authState.busy = true;
  clearError();
  const { error } = await supabase.auth.signOut();
  if (error) setError("sign_out_failed", error.message);
  authState.session = null;
  authState.user = null;
  authState.profile = null;
  verifiedProviderToken = "";
  authState.busy = false;
}

export function destroyAuth() {
  authSubscription?.unsubscribe();
  authSubscription = null;
}
