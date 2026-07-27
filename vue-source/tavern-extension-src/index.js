import { createClient } from "@supabase/supabase-js";

const MODULE = "linephone_sync";
const VERSION = "1.1.4";
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
  authLaunching: false,
  oauthUrl: "",
  current: null,
  timer: null,
  launcher: null,
  panel: null,
  settingsEntry: null,
  fallbackSettings: null,
  status: null,
  summary: null,
  details: null,
  assets: null,
  assetState: {
    books: 0,
    entries: 0,
    truncatedEntries: 0,
    error: "",
  },
  currentAssets: null,
  currentAssetsKey: "",
  mountTimer: null,
  eventsTimer: null,
  eventsBound: false,
  uiObserver: null,
  initialized: false,
};

function defaults() {
  return {
    enabled: true,
    autoSummarize: true,
    interval: 20,
    apiUrl: "https://api.openai.com/v1/chat/completions",
    model: "",
    modelOptions: [],
    assetHashes: {},
    summaryPrompt:
      "请把以下角色扮演对话整理成可长期使用的中文记忆总结。按时间顺序保留人物关系变化、约定、秘密、重要事件、情绪和未完成事项。不要虚构，不要写分析过程，只输出总结正文。",
  };
}

function settings() {
  const context = runtime.context || globalThis.SillyTavern?.getContext?.();
  const fallback = {
    ...defaults(),
    ...(runtime.fallbackSettings || {}),
  };
  const extensionSettings = context?.extensionSettings;
  if (!extensionSettings || typeof extensionSettings !== "object") {
    runtime.fallbackSettings = fallback;
    return fallback;
  }
  extensionSettings[MODULE] = {
    ...fallback,
    ...(extensionSettings[MODULE] || {}),
  };
  runtime.fallbackSettings = extensionSettings[MODULE];
  return extensionSettings[MODULE];
}

function saveSettings() {
  runtime.context?.saveSettingsDebounced?.();
}

function storageGet(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch (error) {
    console.warn(`[${MODULE}] browser storage is unavailable`, error);
    return "";
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`[${MODULE}] browser storage write failed`, error);
  }
}

function randomId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
      .slice(6, 8)
      .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  }
  return `linephone-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getDevice() {
  try {
    const saved = JSON.parse(storageGet(DEVICE_STORAGE) || "null");
    if (saved?.id) return saved;
  } catch {
    // Recreate malformed metadata.
  }
  const device = {
    id: randomId(),
    name: "SillyTavern 接收器",
    platform: "sillytavern",
  };
  storageSet(DEVICE_STORAGE, JSON.stringify(device));
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

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value !== "string") return [];
  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function characterCardPayload(identity) {
  const raw = identity.character || {};
  const data = raw.data && typeof raw.data === "object" ? raw.data : raw;
  return {
    name: stringValue(data.name || raw.name) || identity.characterName,
    description: stringValue(data.description || data.char_persona),
    personality: stringValue(data.personality || data.persona),
    scenario: stringValue(data.scenario || data.world_scenario),
    firstMes: stringValue(data.first_mes || data.first_message || data.greeting),
    mesExample: stringValue(data.mes_example || data.example_dialogue),
    systemPrompt: stringValue(data.system_prompt),
    postHistoryInstructions: stringValue(data.post_history_instructions),
    creatorNotes: stringValue(data.creator_notes || raw.creator_notes),
    creator: stringValue(data.creator),
    characterVersion: stringValue(data.character_version),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    alternateGreetings: Array.isArray(data.alternate_greetings)
      ? data.alternate_greetings.map(String)
      : [],
  };
}

function pipeValue(result) {
  const value = result?.pipe ?? result?.result ?? result?.output ?? "";
  return typeof value === "string" ? value.trim() : String(value || "").trim();
}

async function boundLorebookNames(identity) {
  const names = new Map();
  const add = (name, scope) => {
    const clean = stringValue(name);
    if (!clean) return;
    const scopes = names.get(clean) || new Set();
    scopes.add(scope);
    names.set(clean, scopes);
  };
  const data = identity.character?.data || identity.character || {};
  add(data.extensions?.world, "character");
  add(identity.context.chatMetadata?.world_info, "chat");

  if (typeof identity.context.executeSlashCommandsWithOptions === "function") {
    try {
      const result = await identity.context.executeSlashCommandsWithOptions(
        "/getcharbook type=all",
        { handleParserErrors: false, handleExecutionErrors: false },
      );
      const output = pipeValue(result);
      if (output) {
        const parsed = JSON.parse(output);
        (Array.isArray(parsed) ? parsed : [parsed]).forEach((name) =>
          add(name, "character"),
        );
      }
    } catch (error) {
      console.debug(`[${MODULE}] additional character lorebooks unavailable`, error);
    }
  }
  return names;
}

function truncateUtf8(value, maxBytes = 140000) {
  const text = String(value || "");
  const encoder = new TextEncoder();
  if (encoder.encode(text).byteLength <= maxBytes) return { text, truncated: false };
  let low = 0;
  let high = text.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (encoder.encode(text.slice(0, middle)).byteLength <= maxBytes) low = middle;
    else high = middle - 1;
  }
  return {
    text: `${text.slice(0, low)}\n\n【该条目过长，云端同步内容已截断】`,
    truncated: true,
  };
}

function normalizeLoreEntry(entry, index) {
  const content = truncateUtf8(entry?.content ?? entry?.text ?? "");
  return {
    id: String(entry?.uid ?? entry?.id ?? index),
    keys: stringList(entry?.key ?? entry?.keys ?? entry?.keywords),
    secondaryKeys: stringList(entry?.keysecondary ?? entry?.secondary_keys),
    content: content.text.trim(),
    constant: Boolean(entry?.constant ?? entry?.always_active ?? false),
    selective: Boolean(entry?.selective ?? false),
    enabled: !(entry?.disable ?? entry?.disabled ?? false),
    priority: Number(entry?.order ?? entry?.priority ?? entry?.insertion_order ?? 0),
    comment: stringValue(entry?.comment ?? entry?.name),
    position: Number(entry?.position) || 0,
    truncated: content.truncated,
  };
}

async function collectCharacterAssets(identity) {
  const card = characterCardPayload(identity);
  const names = await boundLorebookNames(identity);
  const books = [];
  let truncatedEntries = 0;

  for (const [name, scopes] of names.entries()) {
    try {
      const raw = await identity.context.loadWorldInfo(name);
      if (!raw || typeof raw !== "object") continue;
      const sourceEntries = raw.entries ?? raw.data?.entries ?? raw;
      const list = Array.isArray(sourceEntries)
        ? sourceEntries
        : sourceEntries && typeof sourceEntries === "object"
          ? Object.values(sourceEntries)
          : [];
      const entries = list
        .map(normalizeLoreEntry)
        .filter((entry) => entry.content);
      truncatedEntries += entries.filter((entry) => entry.truncated).length;
      books.push({
        id: `stbook_${(await sha256(name)).slice(0, 16)}`,
        name,
        scopes: [...scopes],
        enabled: true,
        entries,
      });
    } catch (error) {
      console.warn(`[${MODULE}] failed to load lorebook "${name}"`, error);
    }
  }

  runtime.assetState = {
    books: books.length,
    entries: books.reduce((sum, book) => sum + book.entries.length, 0),
    truncatedEntries,
    error: "",
  };
  return { card, books };
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
  const apiKey = storageGet(API_KEY_STORAGE);
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

async function commit(
  entityType,
  entityId,
  snapshotPayload,
  eventPayload,
  operation = "upsert",
) {
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
      p_operation: operation,
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

function jsonBytes(value) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function splitLoreEntries(entries) {
  const parts = [];
  let current = [];
  for (const entry of entries) {
    const candidate = [...current, entry];
    if (current.length && jsonBytes({ entries: candidate }) > 180000) {
      parts.push(current);
      current = [entry];
    } else {
      current = candidate;
    }
  }
  if (current.length || !parts.length) parts.push(current);
  return parts;
}

async function uploadCharacterAssets(identity, assets) {
  if (!hasAccess()) return;
  const config = settings();
  if (!config.assetHashes || typeof config.assetHashes !== "object") {
    config.assetHashes = {};
  }
  const saved = config.assetHashes[identity.tavernCharacterKey] || {};
  const entityId = `character:${identity.tavernCharacterKey}`;
  const common = {
    schemaVersion: 1,
    tavernCharacterKey: identity.tavernCharacterKey,
    characterName: identity.characterName,
    saveId: identity.saveId,
    saveName: identity.saveName,
    updatedAt: Date.now(),
  };
  const characterHash = await sha256(JSON.stringify(assets.card));
  if (saved.characterHash !== characterHash) {
    await commit(
      "tavern.character",
      entityId,
      {
        ...common,
        contentHash: characterHash,
        card: assets.card,
      },
      {
        kind: "character.replace",
        tavernCharacterKey: identity.tavernCharacterKey,
        characterName: identity.characterName,
        contentHash: characterHash,
      },
    );
    saved.characterHash = characterHash;
  }

  const loreHash = await sha256(JSON.stringify(assets.books));
  if (saved.loreHash !== loreHash) {
    const currentEntities = [];
    const bookIndex = [];
    for (const book of assets.books) {
      const entryParts = splitLoreEntries(book.entries);
      const partEntityIds = [];
      for (let index = 0; index < entryParts.length; index += 1) {
        const partEntityId = `${entityId}:lore:${book.id}:${index}`;
        partEntityIds.push(partEntityId);
        currentEntities.push(partEntityId);
        await commit(
          "tavern.lorebook.part",
          partEntityId,
          {
            ...common,
            bookId: book.id,
            bookName: book.name,
            scopes: book.scopes,
            enabled: book.enabled,
            partIndex: index,
            partCount: entryParts.length,
            entries: entryParts[index],
          },
          {
            kind: "lorebook.part.replace",
            tavernCharacterKey: identity.tavernCharacterKey,
            bookId: book.id,
            partIndex: index,
            partCount: entryParts.length,
          },
        );
      }
      bookIndex.push({
        id: book.id,
        name: book.name,
        scopes: book.scopes,
        enabled: book.enabled,
        entryCount: book.entries.length,
        partEntityIds,
      });
    }
    await commit(
      "tavern.lorebooks",
      entityId,
      {
        ...common,
        contentHash: loreHash,
        books: bookIndex,
        truncatedEntries: runtime.assetState.truncatedEntries,
      },
      {
        kind: "lorebooks.replace",
        tavernCharacterKey: identity.tavernCharacterKey,
        contentHash: loreHash,
        bookCount: bookIndex.length,
      },
    );

    const staleEntities = (saved.loreEntities || []).filter(
      (oldEntityId) => !currentEntities.includes(oldEntityId),
    );
    for (const staleEntityId of staleEntities) {
      await commit(
        "tavern.lorebook.part",
        staleEntityId,
        {},
        {
          kind: "lorebook.part.delete",
          tavernCharacterKey: identity.tavernCharacterKey,
        },
        "delete",
      );
    }
    saved.loreHash = loreHash;
    saved.loreEntities = currentEntities;
  }
  config.assetHashes[identity.tavernCharacterKey] = saved;
  saveSettings();
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

async function processCurrent({
  forceUpload = false,
  allowSummary = true,
  refreshAssets = false,
} = {}) {
  if (runtime.busy || !settings().enabled) return;
  let identity;
  try {
    identity = await currentIdentity();
  } catch (error) {
    runtime.lastError = error.message || "读取当前聊天失败";
    console.error(`[${MODULE}] failed to read the current chat`, error);
    render();
    return;
  }
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
    if (
      refreshAssets ||
      runtime.currentAssetsKey !== identity.tavernCharacterKey ||
      !runtime.currentAssets
    ) {
      runtime.currentAssets = await collectCharacterAssets(identity);
      runtime.currentAssetsKey = identity.tavernCharacterKey;
    }
    if (hasAccess()) {
      try {
        await uploadCharacterAssets(identity, runtime.currentAssets);
      } catch (error) {
        runtime.assetState.error = error.message || "角色资料同步失败";
        console.error(`[${MODULE}] asset sync failed`, error);
      }
    }
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
  runtime.oauthUrl = "";
  runtime.authLaunching = true;
  render();
  const redirectTo = `${location.origin}${location.pathname}`;
  let authWindow = null;

  try {
    // Open a blank tab while the click still has user activation. Android
    // WebAPK/PWA shells otherwise try to replace the whole local Tavern page
    // and can abort when the navigation leaves the installed-app scope.
    authWindow = window.open("about:blank", "_blank");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo,
        scopes: "guilds guilds.members.read",
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    if (!data?.url) throw new Error("未能生成 Discord 登录链接");

    runtime.oauthUrl = data.url;
    if (authWindow && !authWindow.closed) {
      authWindow.location.replace(data.url);
      try {
        authWindow.opener = null;
      } catch {
        // Some embedded browsers expose a read-only opener.
      }
    } else {
      runtime.lastError = "系统未自动打开外部浏览器，请点击下方链接继续登录";
    }
  } catch (error) {
    authWindow?.close?.();
    runtime.lastError = error?.message || "Discord 登录启动失败";
  } finally {
    runtime.authLaunching = false;
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
  const apiKey = storageGet(API_KEY_STORAGE);
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
    : runtime.authLaunching
      ? "正在外部浏览器中打开 Discord…"
    : runtime.lastError
      ? runtime.lastError
      : runtime.oauthUrl && !runtime.session
        ? "Discord 授权页已打开，完成后返回酒馆"
      : hasAccess()
        ? "Discord 已验证 · 云端可用"
        : runtime.session
          ? "已登录，等待社区验证"
          : "尚未登录";
  runtime.status.classList.toggle("error", Boolean(runtime.lastError));
  runtime.details.textContent = identity
    ? `${identity.characterName} · ${identity.saveName} · ${rounds.length} 楼 · 已总结 ${memory.coveredThrough || 0} 楼`
    : "请先打开单角色聊天存档";
  if (runtime.assets) {
    const { books, entries, truncatedEntries, error } = runtime.assetState;
    runtime.assets.textContent = identity
      ? `${error ? `资料同步失败：${error} · ` : ""}角色卡已读取 · ${books} 本绑定世界书 · ${entries} 个条目${
          truncatedEntries ? ` · ${truncatedEntries} 条过长内容已截断` : ""
        }`
      : "打开角色聊天后会自动读取角色卡与绑定世界书";
  }
  runtime.summary.value = memory?.summary || "";

  const loginButton = runtime.panel.querySelector("[data-action=login]");
  const logoutButton = runtime.panel.querySelector("[data-action=logout]");
  const oauthHelp = runtime.panel.querySelector(".lp-oauth-help");
  const oauthLink = oauthHelp?.querySelector("[data-action=oauth-link]");
  loginButton.hidden = Boolean(runtime.session);
  loginButton.disabled = runtime.authLaunching;
  loginButton.textContent = runtime.authLaunching ? "正在打开 Discord…" : "使用 Discord 登录";
  logoutButton.hidden = !runtime.session;
  if (oauthHelp && oauthLink) {
    oauthHelp.hidden = Boolean(runtime.session) || !runtime.oauthUrl;
    oauthLink.href = runtime.oauthUrl || "#";
  }

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

function setPanelVisible(visible) {
  const panel = runtime.panel;
  if (!panel) return;

  if (!visible) {
    panel.setAttribute("data-open", "false");
    panel.setAttribute("aria-hidden", "true");
    return;
  }

  panel.setAttribute("data-open", "true");
  panel.setAttribute("aria-hidden", "false");
  render();
  currentIdentity()
    .then((identity) => {
      runtime.current = identity;
      render();
    })
    .catch((error) => {
      runtime.lastError = error.message || "读取当前聊天失败";
      console.error(`[${MODULE}] failed to refresh panel`, error);
      render();
    });
}

function startUiMonitor() {
  if (runtime.uiObserver || !document.body) return;
  runtime.uiObserver = new MutationObserver(() => {
    if (!runtime.panel?.isConnected || !runtime.launcher?.isConnected) {
      buildUi();
      return;
    }
    mountSettingsEntry();
  });
  runtime.uiObserver.observe(document.body, { childList: true, subtree: true });
}

function mountSettingsEntry() {
  if (runtime.settingsEntry?.isConnected) return true;
  const existing = document.querySelector("#linephone-sync-settings-entry");
  if (existing?.isConnected) {
    runtime.settingsEntry = existing;
    return true;
  }
  const host =
    document.querySelector("#extensions_settings") ||
    document.querySelector("#extensions_settings2");
  if (!host) {
    clearTimeout(runtime.mountTimer);
    runtime.mountTimer = setTimeout(mountSettingsEntry, 800);
    return false;
  }
  clearTimeout(runtime.mountTimer);
  runtime.mountTimer = null;
  const entry = element(
    "div",
    "extension_container lp-settings-entry linephone-sync-settings-entry",
  );
  entry.id = "linephone-sync-settings-entry";
  entry.innerHTML = `
    <div class="inline-drawer">
      <div class="inline-drawer-toggle inline-drawer-header">
        <b>LinePhone 小手机同步</b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
      </div>
      <div class="inline-drawer-content">
        <p>同步当前角色、绑定世界书、聊天楼层和阶段总结。</p>
        <button type="button" class="menu_button" data-action="open-linephone">
          打开小手机同步控制面板
        </button>
      </div>
    </div>
  `;
  entry
    .querySelector("[data-action=open-linephone]")
    .addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setPanelVisible(true);
    });
  host.append(entry);
  runtime.settingsEntry = entry;
  return true;
}

function buildUi() {
  if (runtime.panel?.isConnected && runtime.launcher?.isConnected) {
    mountSettingsEntry();
    startUiMonitor();
    return;
  }
  const existingLauncher = document.querySelector("#linephone-sync-launcher");
  if (runtime.launcher && runtime.launcher !== existingLauncher) {
    runtime.launcher.remove();
  }
  runtime.panel?.remove();
  const button = existingLauncher || element("button", "lp-sync-launcher", "⇄");
  button.id = "linephone-sync-launcher";
  button.type = "button";
  button.title = "小手机同步";
  const panel = element("section", "lp-tavern-panel");
  panel.id = "linephone-sync-panel";
  panel.setAttribute("data-open", "false");
  panel.setAttribute("aria-hidden", "true");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "小手机同步");
  panel.innerHTML = `
    <header>
      <div><small>LINEPHONE RECEIVER</small><h2>小手机同步</h2></div>
      <button type="button" data-action="close">×</button>
    </header>
    <p class="lp-status"></p>
    <p class="lp-details"></p>
    <p class="lp-assets"></p>
    <div class="lp-auth-actions">
      <button type="button" data-action="login">使用 Discord 登录</button>
      <button type="button" data-action="logout">退出登录</button>
    </div>
    <p class="lp-oauth-help" hidden>
      没有自动打开？
      <a data-action="oauth-link" target="_blank" rel="external noopener noreferrer">
        点这里在浏览器中继续 Discord 登录
      </a>
    </p>
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
  if (!button.isConnected) document.body.append(button);
  document.body.append(panel);
  runtime.launcher = button;
  runtime.panel = panel;
  runtime.status = panel.querySelector(".lp-status");
  runtime.details = panel.querySelector(".lp-details");
  runtime.assets = panel.querySelector(".lp-assets");
  runtime.summary = panel.querySelector(".lp-summary");
  mountSettingsEntry();
  startUiMonitor();

  const config = settings();
  const api = panel.querySelector(".lp-api");
  const apiUrl = inputFor("url", config.apiUrl, (value) => {
    settings().apiUrl = value.trim();
    saveSettings();
  });
  const apiKey = inputFor(
    "password",
    storageGet(API_KEY_STORAGE),
    (value) => storageSet(API_KEY_STORAGE, value),
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

  if (
    button.dataset.linephoneBootstrapBound !== "true" &&
    button.dataset.linephoneAppBound !== "true"
  ) {
    button.dataset.linephoneAppBound = "true";
    button.addEventListener("click", () => {
      setPanelVisible(panel.getAttribute("data-open") !== "true");
    });
  }
  panel.querySelector("[data-action=close]").addEventListener("click", () => {
    setPanelVisible(false);
  });
  panel.querySelector("[data-action=login]").addEventListener("click", login);
  panel.querySelector("[data-action=logout]").addEventListener("click", logout);
  panel.querySelector("[data-action=sync-now]").addEventListener("click", () =>
    processCurrent({ forceUpload: true, allowSummary: true, refreshAssets: true }),
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
  if (runtime.eventsBound) return true;
  const eventSource = runtime.context?.eventSource;
  const eventTypes = runtime.context?.eventTypes;
  if (typeof eventSource?.on !== "function" || !eventTypes) return false;
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
  const assetEvents = [
    eventTypes.CHARACTER_EDITED,
    eventTypes.CHARACTER_SELECTED,
    eventTypes.WORLDINFO_UPDATED,
    eventTypes.WORLDINFO_SETTINGS_UPDATED,
  ].filter(Boolean);
  assetEvents.forEach((event) =>
    eventSource.on(event, () =>
      scheduleProcess({ forceUpload: true, refreshAssets: true }),
    ),
  );
  if (eventTypes.CHAT_CHANGED) {
    eventSource.on(eventTypes.CHAT_CHANGED, () =>
      scheduleProcess({ forceUpload: true, refreshAssets: true }),
    );
  }
  runtime.eventsBound = true;
  return true;
}

function ensureEventsBound() {
  if (bindEvents()) {
    clearTimeout(runtime.eventsTimer);
    runtime.eventsTimer = null;
    return;
  }
  clearTimeout(runtime.eventsTimer);
  runtime.eventsTimer = setTimeout(() => {
    try {
      runtime.context = currentContext();
      ensureEventsBound();
    } catch (error) {
      console.debug(`[${MODULE}] waiting for SillyTavern events`, error);
      ensureEventsBound();
    }
  }, 800);
}

async function initializeAuth() {
  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(async () => {
      runtime.session = session;
      runtime.profile = null;
      runtime.connected = false;
      if (session) runtime.oauthUrl = "";
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
          scheduleProcess({ forceUpload: true, refreshAssets: true });
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

async function waitForSillyTavern(timeoutMs = 15000) {
  const startedAt = Date.now();
  while (!globalThis.SillyTavern?.getContext || !document.body) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("等待 SillyTavern 初始化超时");
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function ensureUiMounted() {
  await waitForSillyTavern();
  runtime.context = currentContext();
  buildUi();
}

async function init() {
  if (runtime.initialized) return;
  await ensureUiMounted();
  runtime.initialized = true;
  settings();
  runtime.device = getDevice();
  ensureEventsBound();
  try {
    await initializeAuth();
  } catch (error) {
    runtime.lastError = error.message || "登录状态初始化失败";
    console.error(`[${MODULE}] auth initialization failed`, error);
    render();
  }
  scheduleProcess({ forceUpload: true, refreshAssets: true });
  console.log(`[${MODULE}] v${VERSION} loaded`);
}

let initPromise = null;

function ensureInitialized() {
  initPromise ||= init().catch((error) => {
    runtime.initialized = false;
    console.error(`[${MODULE}] initialization failed`, error);
    runtime.lastError = error.message || "初始化失败";
    render();
    throw error;
  });
  return initPromise;
}

export async function onActivate() {
  await ensureUiMounted();
  return ensureInitialized();
}

export async function onEnable() {
  await ensureUiMounted();
  return ensureInitialized();
}

export async function openPanel() {
  await ensureUiMounted();
  setPanelVisible(true);
}

Promise.resolve().then(() => {
  ensureInitialized().catch(() => {
    // The lifecycle hook may retry initialization after the app is ready.
    initPromise = null;
  });
});
