import { createClient } from "@supabase/supabase-js";

const MODULE = "linephone_sync";
const VERSION = "1.0.0";
const SUPABASE_URL = "https://tlsdyacdkbcjxbwvyeim.supabase.co";
const SUPABASE_KEY = "sb_publishable_EIYn8wiMd0O4tJXQI5Ub4Q_066Uizi1";
const VERIFY_URL = `${SUPABASE_URL}/functions/v1/verify-discord-membership`;
const API_KEY_STORAGE = "linephone.tavern.api-key";
const DEVICE_STORAGE = "linephone.tavern.device";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storageKey: "linephone-tavern-auth",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const runtime = {
  context: null,
  session: null,
  profile: null,
  device: null,
  revisions: new Map(),
  busy: false,
  connected: false,
  lastError: "",
  current: null,
  timer: null,
  panel: null,
  status: null,
  summary: null,
  details: null,
};

function defaults() {
  return {
    enabled: true,
    autoSummarize: true,
    interval: 20,
    apiUrl: "https://api.openai.com/v1/chat/completions",
    model: "",
    modelOptions: [],
    summaryPrompt:
      "请把以下角色扮演对话整理成可长期使用的中文记忆总结。按时间顺序保留人物关系变化、约定、秘密、重要事件、情绪和未完成事项。不要虚构，不要写分析过程，只输出总结正文。",
  };
}

function settings() {
  const context = runtime.context || SillyTavern.getContext();
  context.extensionSettings[MODULE] = {
    ...defaults(),
    ...(context.extensionSettings[MODULE] || {}),
  };
  return context.extensionSettings[MODULE];
}

function saveSettings() {
  runtime.context?.saveSettingsDebounced?.();
}

function getDevice() {
  try {
    const saved = JSON.parse(localStorage.getItem(DEVICE_STORAGE) || "null");
    if (saved?.id) return saved;
  } catch {
    // Recreate malformed metadata.
  }
  const device = {
    id: crypto.randomUUID(),
    name: "SillyTavern 接收器",
    platform: "sillytavern",
  };
  localStorage.setItem(DEVICE_STORAGE, JSON.stringify(device));
  return device;
}

function normalizeEndpoint(url, suffix) {
  const clean = String(url || "").trim().replace(/\/+$/, "");
  if (!clean) throw new Error("请先填写 API 地址");
  if (/\/chat\/completions$/i.test(clean)) {
    return suffix === "models"
      ? clean.replace(/\/chat\/completions$/i, "/models")
      : clean;
  }
  if (/\/v1$/i.test(clean)) return `${clean}/${suffix}`;
  if (/\/v1\/.+/i.test(clean)) {
    return suffix === "models"
      ? clean.replace(/\/v1\/.*$/i, "/v1/models")
      : `${clean}/chat/completions`;
  }
  return `${clean}/v1/${suffix}`;
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(String(text || ""));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function currentContext() {
  runtime.context = SillyTavern.getContext();
  return runtime.context;
}

function activeCharacter(context) {
  if (context.groupId) return null;
  return context.characters?.[context.characterId] || null;
}

async function currentIdentity() {
  const context = currentContext();
  const character = activeCharacter(context);
  const saveId = String(context.chatId || context.getCurrentChatId?.() || "");
  if (!character || !saveId) return null;
  // Avatar filenames are stable across chat files and survive ordinary display-name edits.
  const source = character.avatar || character.name || "character";
  const tavernCharacterKey = `st_${(await sha256(source)).slice(0, 24)}`;
  return {
    context,
    character,
    characterName: character.name || context.name2 || "未命名角色",
    tavernCharacterKey,
    saveId,
    saveName: saveId.replace(/\.(jsonl|json)$/i, "") || "酒馆存档",
  };
}

function buildRounds(chat) {
  const rounds = [];
  let pendingUser = null;
  for (const message of chat || []) {
    if (!message || message.is_system || !String(message.mes || "").trim()) continue;
    if (message.is_user) {
      pendingUser = String(message.mes).trim();
      continue;
    }
    if (!pendingUser) continue;
    rounds.push({
      floor: rounds.length + 1,
      user: pendingUser,
      assistant: String(message.mes).trim(),
      swipeId: Number(message.swipe_id) || 0,
    });
    pendingUser = null;
  }
  return rounds;
}

function getSaveMemory(context) {
  context.chatMetadata ||= {};
  context.chatMetadata[MODULE] = {
    summary: "",
    coveredThrough: 0,
    sourceHash: "",
    summaryStale: false,
    lastUploadedHash: "",
    lastUploadedAt: 0,
    updatedAt: 0,
    ...(context.chatMetadata[MODULE] || {}),
  };
  return context.chatMetadata[MODULE];
}

function saveSaveMemory(context) {
  context.saveMetadataDebounced?.();
}

async function requestSummary({ previousSummary, rounds }) {
  const config = settings();
  const apiKey = localStorage.getItem(API_KEY_STORAGE) || "";
  if (!config.model) throw new Error("请先拉取并选择总结模型");
  const dialogue = rounds
    .map(
      (round) =>
        `【第 ${round.floor} 楼】\n玩家：${round.user}\n角色：${round.assistant}`,
    )
    .join("\n\n");
  const userContent = previousSummary
    ? `【已有总结】\n${previousSummary}\n\n【新增对话】\n${dialogue}`
    : `【需要总结的完整对话】\n${dialogue}`;
  const response = await fetch(normalizeEndpoint(config.apiUrl, "chat/completions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: config.summaryPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.25,
      max_tokens: 1800,
    }),
  });
  if (!response.ok) throw new Error(`总结 API 返回 ${response.status}`);
  const payload = await response.json();
  const content =
    payload?.choices?.[0]?.message?.content ||
    payload?.choices?.[0]?.text ||
    payload?.output_text ||
    "";
  if (!String(content).trim()) throw new Error("总结 API 返回了空内容");
  return String(content).trim();
}

async function verifyDiscord(session) {
  if (!session?.provider_token || !session?.access_token) return;
  const response = await fetch(VERIFY_URL, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ providerToken: session.provider_token }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.code || "Discord 社区身份验证失败");
  }
  await supabase.auth.refreshSession();
}

async function loadProfile() {
  if (!runtime.session?.user?.id) {
    runtime.profile = null;
    return null;
  }
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id,status,membership_valid_until,discord_username")
    .eq("user_id", runtime.session.user.id)
    .maybeSingle();
  if (error) throw error;
  runtime.profile = data;
  return data;
}

function hasAccess() {
  const until = Date.parse(runtime.profile?.membership_valid_until || "");
  return (
    runtime.profile?.status === "active" &&
    Number.isFinite(until) &&
    until > Date.now()
  );
}

async function registerDevice() {
  runtime.device = getDevice();
  const { error } = await supabase.rpc("register_sync_device", {
    p_device_id: runtime.device.id,
    p_device_name: runtime.device.name,
    p_platform: runtime.device.platform,
    p_app_version: VERSION,
  });
  if (error) throw error;
}

async function loadRevisions() {
  runtime.revisions.clear();
  const { data, error } = await supabase
    .from("latest_snapshots")
    .select("entity_type,entity_id,revision");
  if (error) throw error;
  for (const row of data || []) {
    runtime.revisions.set(`${row.entity_type}|${row.entity_id}`, Number(row.revision) || 0);
  }
}

async function commit(entityType, entityId, snapshotPayload, eventPayload) {
  const key = `${entityType}|${entityId}`;
  let revision = (runtime.revisions.get(key) || 0) + 1;
  const eventId = crypto.randomUUID();
  const send = () =>
    supabase.rpc("commit_sync_change", {
      p_event_id: eventId,
      p_source_device_id: runtime.device.id,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_revision: revision,
      p_operation: "upsert",
      p_snapshot_payload: snapshotPayload,
      p_event_payload: eventPayload || snapshotPayload,
    });
  let result = await send();
  if (
    result.error &&
    String(result.error.message || "").includes("stale_snapshot_revision")
  ) {
    const { data } = await supabase
      .from("latest_snapshots")
      .select("revision")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();
    revision = (Number(data?.revision) || 0) + 1;
    result = await send();
  }
  if (result.error) throw result.error;
  runtime.revisions.set(key, revision);
  return revision;
}

async function uploadCurrent(identity, rounds, memory) {
  if (!hasAccess()) throw new Error("请先完成 Discord 登录与社区验证");
  const boundary = Math.min(Number(memory.coveredThrough) || 0, rounds.length);
  const recent = rounds.slice(boundary);
  const entityId = `character:${identity.tavernCharacterKey}`;
  const common = {
    schemaVersion: 1,
    tavernCharacterKey: identity.tavernCharacterKey,
    characterName: identity.characterName,
    saveId: identity.saveId,
    saveName: identity.saveName,
    totalFloors: rounds.length,
    updatedAt: Date.now(),
  };
  await commit(
    "tavern.active",
    entityId,
    {
      ...common,
      summaryThrough: boundary,
      unsummarizedFloors: recent.length,
    },
    { kind: "save.active", ...common },
  );
  await commit(
    "tavern.summary",
    entityId,
    {
      ...common,
      coveredThrough: boundary,
      content: memory.summary || "",
      sourceHash: memory.sourceHash || "",
      stale: Boolean(memory.summaryStale),
      manuallyEditedAt: memory.manuallyEditedAt || 0,
    },
    {
      kind: "summary.replace",
      tavernCharacterKey: identity.tavernCharacterKey,
      saveId: identity.saveId,
      coveredThrough: boundary,
    },
  );
  await commit(
    "tavern.recent",
    entityId,
    {
      ...common,
      startsAfter: boundary,
      rounds: recent,
    },
    {
      kind: "recent.replace",
      tavernCharacterKey: identity.tavernCharacterKey,
      saveId: identity.saveId,
      floorCount: recent.length,
    },
  );
}

async function processCurrent({ forceUpload = false, allowSummary = true } = {}) {
  if (runtime.busy || !settings().enabled) return;
  const identity = await currentIdentity();
  runtime.current = identity;
  if (!identity) {
    render();
    return;
  }
  runtime.busy = true;
  runtime.lastError = "";
  try {
    const rounds = buildRounds(identity.context.chat);
    const memory = getSaveMemory(identity.context);
    const liveHash = await sha256(JSON.stringify(rounds));
    const interval = Math.min(200, Math.max(2, Number(settings().interval) || 20));
    const targetBoundary = Math.floor(rounds.length / interval) * interval;
    const targetHash = targetBoundary
      ? await sha256(JSON.stringify(rounds.slice(0, targetBoundary)))
      : "";
    const changedCoveredContent =
      Number(memory.coveredThrough) !== targetBoundary ||
      memory.sourceHash !== targetHash;

    if (
      allowSummary &&
      settings().autoSummarize &&
      changedCoveredContent &&
      targetBoundary > 0 &&
      settings().model
    ) {
      const oldBoundary = Math.min(Number(memory.coveredThrough) || 0, targetBoundary);
      const oldPrefixHash = oldBoundary
        ? await sha256(JSON.stringify(rounds.slice(0, oldBoundary)))
        : "";
      const canRollForward =
        oldBoundary > 0 &&
        oldBoundary < targetBoundary &&
        memory.summary &&
        memory.sourceHash === oldPrefixHash;
      const summaryRounds = canRollForward
        ? rounds.slice(oldBoundary, targetBoundary)
        : rounds.slice(0, targetBoundary);
      memory.summary = await requestSummary({
        previousSummary: canRollForward ? memory.summary : "",
        rounds: summaryRounds,
      });
      memory.coveredThrough = targetBoundary;
      memory.sourceHash = targetHash;
      memory.summaryStale = false;
      memory.updatedAt = Date.now();
      memory.manuallyEditedAt = 0;
      saveSaveMemory(identity.context);
    } else if (changedCoveredContent && targetBoundary === 0) {
      memory.summary = "";
      memory.coveredThrough = 0;
      memory.sourceHash = "";
      memory.summaryStale = false;
      memory.updatedAt = Date.now();
      memory.manuallyEditedAt = 0;
      saveSaveMemory(identity.context);
    } else if (changedCoveredContent && targetBoundary > 0) {
      // The old summary is no longer authoritative until the configured model rebuilds it.
      memory.summaryStale = true;
      memory.updatedAt = Date.now();
      saveSaveMemory(identity.context);
    }

    const uploadHash = await sha256(
      JSON.stringify({
        saveId: identity.saveId,
        liveHash,
        summary: memory.summary || "",
        coveredThrough: Number(memory.coveredThrough) || 0,
        sourceHash: memory.sourceHash || "",
        summaryStale: Boolean(memory.summaryStale),
      }),
    );
    if (hasAccess() && (forceUpload || memory.lastUploadedHash !== uploadHash)) {
      await uploadCurrent(identity, rounds, memory);
      memory.lastUploadedHash = uploadHash;
      memory.lastUploadedAt = Date.now();
      saveSaveMemory(identity.context);
    }
    runtime.connected = hasAccess();
  } catch (error) {
    runtime.lastError = error.message || "同步失败";
    console.error(`[${MODULE}]`, error);
  } finally {
    runtime.busy = false;
    render();
  }
}

function scheduleProcess(options = {}) {
  clearTimeout(runtime.timer);
  runtime.timer = setTimeout(() => processCurrent(options), 900);
}

async function login() {
  runtime.lastError = "";
  const redirectTo = `${location.origin}${location.pathname}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo,
      scopes: "guilds guilds.members.read",
    },
  });
  if (error) {
    runtime.lastError = error.message;
    render();
  }
}

async function logout() {
  await supabase.auth.signOut();
  runtime.session = null;
  runtime.profile = null;
  runtime.connected = false;
  render();
}

async function pullModels() {
  const config = settings();
  const apiKey = localStorage.getItem(API_KEY_STORAGE) || "";
  const response = await fetch(normalizeEndpoint(config.apiUrl, "models"), {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  });
  if (!response.ok) throw new Error(`模型接口返回 ${response.status}`);
  const payload = await response.json();
  const source = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.models)
      ? payload.models
      : Array.isArray(payload)
        ? payload
        : [];
  config.modelOptions = [
    ...new Set(
      source
        .map((item) => (typeof item === "string" ? item : item?.id || item?.name))
        .filter(Boolean),
    ),
  ].sort();
  if (!config.modelOptions.includes(config.model)) config.model = config.modelOptions[0] || "";
  saveSettings();
  render();
}

function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function field(label, input) {
  const wrapper = element("label", "lp-field");
  wrapper.append(element("span", "", label), input);
  return wrapper;
}

function inputFor(type, value, onChange) {
  const input = document.createElement("input");
  input.type = type;
  input.value = value ?? "";
  input.addEventListener("change", () => onChange(input.value));
  return input;
}

function render() {
  if (!runtime.panel) return;
  const config = settings();
  const identity = runtime.current;
  const rounds = identity ? buildRounds(identity.context.chat) : [];
  const memory = identity ? getSaveMemory(identity.context) : null;

  runtime.status.textContent = runtime.busy
    ? "正在处理…"
    : runtime.lastError
      ? runtime.lastError
      : hasAccess()
        ? "Discord 已验证 · 云端可用"
        : runtime.session
          ? "已登录，等待社区验证"
          : "尚未登录";
  runtime.status.classList.toggle("error", Boolean(runtime.lastError));
  runtime.details.textContent = identity
    ? `${identity.characterName} · ${identity.saveName} · ${rounds.length} 楼 · 已总结 ${memory.coveredThrough || 0} 楼`
    : "请先打开单角色聊天存档";
  runtime.summary.value = memory?.summary || "";

  const loginButton = runtime.panel.querySelector("[data-action=login]");
  const logoutButton = runtime.panel.querySelector("[data-action=logout]");
  loginButton.hidden = Boolean(runtime.session);
  logoutButton.hidden = !runtime.session;

  const modelSelect = runtime.panel.querySelector("[data-field=model]");
  modelSelect.replaceChildren();
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = config.modelOptions.length ? "选择模型" : "先拉取模型";
  modelSelect.append(empty);
  for (const model of config.modelOptions) {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    modelSelect.append(option);
  }
  modelSelect.value = config.model || "";
}

function buildUi() {
  const button = element("button", "lp-sync-launcher", "⇄");
  button.type = "button";
  button.title = "小手机同步";
  const panel = element("aside", "lp-tavern-panel");
  panel.hidden = true;
  panel.innerHTML = `
    <header>
      <div><small>LINEPHONE RECEIVER</small><h2>小手机同步</h2></div>
      <button type="button" data-action="close">×</button>
    </header>
    <p class="lp-status"></p>
    <p class="lp-details"></p>
    <div class="lp-auth-actions">
      <button type="button" data-action="login">使用 Discord 登录</button>
      <button type="button" data-action="logout">退出登录</button>
    </div>
    <section class="lp-section lp-api"></section>
    <section class="lp-section">
      <div class="lp-section-title"><strong>当前阶段总结</strong><small>保存在这个酒馆存档本地</small></div>
      <textarea class="lp-summary" rows="8" placeholder="达到总结楼层后自动生成，也可以手动编辑"></textarea>
      <div class="lp-row">
        <button type="button" data-action="save-summary">保存并覆盖云端</button>
        <button type="button" data-action="sync-now">立即读取并同步</button>
      </div>
    </section>
  `;
  document.body.append(button, panel);
  runtime.panel = panel;
  runtime.status = panel.querySelector(".lp-status");
  runtime.details = panel.querySelector(".lp-details");
  runtime.summary = panel.querySelector(".lp-summary");

  const config = settings();
  const api = panel.querySelector(".lp-api");
  const apiUrl = inputFor("url", config.apiUrl, (value) => {
    settings().apiUrl = value.trim();
    saveSettings();
  });
  const apiKey = inputFor(
    "password",
    localStorage.getItem(API_KEY_STORAGE) || "",
    (value) => localStorage.setItem(API_KEY_STORAGE, value),
  );
  const model = document.createElement("select");
  model.dataset.field = "model";
  model.addEventListener("change", () => {
    settings().model = model.value;
    saveSettings();
  });
  const interval = inputFor("number", config.interval, (value) => {
    settings().interval = Math.min(200, Math.max(2, Number(value) || 20));
    saveSettings();
  });
  interval.min = "2";
  interval.max = "200";
  const auto = document.createElement("input");
  auto.type = "checkbox";
  auto.checked = config.autoSummarize;
  auto.addEventListener("change", () => {
    settings().autoSummarize = auto.checked;
    saveSettings();
  });
  const pull = element("button", "", "拉取模型");
  pull.type = "button";
  pull.addEventListener("click", () =>
    pullModels().catch((error) => {
      runtime.lastError = error.message;
      render();
    }),
  );
  const modelRow = element("div", "lp-model-row");
  modelRow.append(model, pull);
  api.append(
    element("div", "lp-section-title", "自动总结 API"),
    field("API 地址", apiUrl),
    field("API Key（只存当前浏览器）", apiKey),
    field("模型", modelRow),
    field("每多少楼总结一次", interval),
    field("启用自动总结", auto),
  );

  button.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      currentIdentity().then((identity) => {
        runtime.current = identity;
        render();
      });
    }
  });
  panel.querySelector("[data-action=close]").addEventListener("click", () => {
    panel.hidden = true;
  });
  panel.querySelector("[data-action=login]").addEventListener("click", login);
  panel.querySelector("[data-action=logout]").addEventListener("click", logout);
  panel.querySelector("[data-action=sync-now]").addEventListener("click", () =>
    processCurrent({ forceUpload: true, allowSummary: true }),
  );
  panel.querySelector("[data-action=save-summary]").addEventListener("click", async () => {
    const identity = await currentIdentity();
    if (!identity) return;
    const memory = getSaveMemory(identity.context);
    const rounds = buildRounds(identity.context.chat);
    const interval = Math.min(200, Math.max(2, Number(settings().interval) || 20));
    const targetBoundary = Math.floor(rounds.length / interval) * interval;
    memory.summary = runtime.summary.value.trim();
    memory.coveredThrough = targetBoundary;
    memory.sourceHash = targetBoundary
      ? await sha256(JSON.stringify(rounds.slice(0, targetBoundary)))
      : "";
    memory.summaryStale = false;
    memory.manuallyEditedAt = Date.now();
    memory.updatedAt = Date.now();
    saveSaveMemory(identity.context);
    await processCurrent({ forceUpload: true, allowSummary: false });
  });
  render();
}

function bindEvents() {
  const { eventSource, eventTypes } = runtime.context;
  const watched = [
    eventTypes.MESSAGE_SENT,
    eventTypes.MESSAGE_RECEIVED,
    eventTypes.MESSAGE_EDITED,
    eventTypes.MESSAGE_DELETED,
    eventTypes.MESSAGE_UPDATED,
    eventTypes.MESSAGE_SWIPED,
    eventTypes.GENERATION_ENDED,
  ].filter(Boolean);
  watched.forEach((event) => eventSource.on(event, () => scheduleProcess()));
  eventSource.on(eventTypes.CHAT_CHANGED, () => scheduleProcess({ forceUpload: true }));
}

async function initializeAuth() {
  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(async () => {
      runtime.session = session;
      runtime.profile = null;
      runtime.connected = false;
      if (!session) {
        render();
        return;
      }
      try {
        if (session.provider_token) await verifyDiscord(session);
        const { data } = await supabase.auth.getSession();
        runtime.session = data.session;
        await loadProfile();
        if (hasAccess()) {
          await registerDevice();
          await loadRevisions();
          runtime.connected = true;
          scheduleProcess({ forceUpload: true });
        }
      } catch (error) {
        runtime.lastError = error.message;
      }
      render();
    }, 0);
  });
  const { data } = await supabase.auth.getSession();
  runtime.session = data.session;
  if (runtime.session) {
    await loadProfile().catch((error) => {
      runtime.lastError = error.message;
    });
    if (hasAccess()) {
      await registerDevice();
      await loadRevisions();
      runtime.connected = true;
    }
  }
}

async function init() {
  runtime.context = currentContext();
  settings();
  runtime.device = getDevice();
  buildUi();
  bindEvents();
  await initializeAuth();
  scheduleProcess({ forceUpload: true });
  console.log(`[${MODULE}] v${VERSION} loaded`);
}

init().catch((error) => {
  console.error(`[${MODULE}] initialization failed`, error);
  runtime.lastError = error.message || "初始化失败";
  render();
});
