import { createClient } from "@supabase/supabase-js";

const MODULE = "linephone_sync";
const VERSION = "1.2.0";
const SHARED_MEMORY_PROMPT = `${MODULE}_shared_memory`;
const EXTENSION_PROMPT_IN_CHAT = 1;
const EXTENSION_PROMPT_SYSTEM_ROLE = 0;
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
  phoneMemory: null,
  phoneMemoryKey: "",
  summaryRequestActive: false,
  timer: null,
  launcher: null,
  panel: null,
  settingsEntry: null,
  fallbackSettings: null,
  status: null,
  summary: null,
  details: null,
  memoryStatus: null,
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
      "è¯·æŠŠä»¥ä¸‹è§’è‰²æ‰®æ¼”å¯¹è¯æ•´ç†æˆå¯é•¿æœŸä½¿ç”¨çš„ä¸­æ–‡è®°å¿†æ€»ç»“ã€‚æŒ‰æ—¶é—´é¡ºåºä¿ç•™äººç‰©å…³ç³»å˜åŒ–ã€çº¦å®šã€ç§˜å¯†ã€é‡è¦äº‹ä»¶ã€æƒ…ç»ªå’Œæœªå®Œæˆäº‹é¡¹ã€‚ä¸è¦è™šæž„ï¼Œä¸è¦å†™åˆ†æžè¿‡ç¨‹ï¼Œåªè¾“å‡ºæ€»ç»“æ­£æ–‡ã€‚",
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
    name: "SillyTavern æŽ¥æ”¶å™¨",
    platform: "sillytavern",
  };
  storageSet(DEVICE_STORAGE, JSON.stringify(device));
  return device;
}

function normalizeEndpoint(url, suffix) {
  const clean = String(url || "").trim().replace(/\/+$/, "");
  if (!clean) throw new Error("è¯·å…ˆå¡«å†™ API åœ°å€");
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
    characterName: character.name || context.name2 || "æœªå‘½åè§’è‰²",
    tavernCharacterKey,
    saveId,
    saveName: saveId.replace(/\.(jsonl|json)$/i, "") || "é…’é¦†å­˜æ¡£",
  };
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value !== "string") return [];
  return value
    .split(/[,ï¼Œ\n]/)
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
    text: `${text.slice(0, low)}\n\nã€è¯¥æ¡ç›®è¿‡é•¿ï¼Œäº‘ç«¯åŒæ­¥å†…å®¹å·²æˆªæ–­ã€‘`,
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
  const dialogue = rounds
    .map(
      (round) =>
        `ã€ç¬¬ ${round.floor} æ¥¼ã€‘\nçŽ©å®¶ï¼š${round.user}\nè§’è‰²ï¼š${round.assistant}`,
    )
    .join("\n\n");
  const userContent = previousSummary
    ? `ã€å·²æœ‰æ€»ç»“ã€‘\n${previousSummary}\n\nã€æ–°å¢žå¯¹è¯ã€‘\n${dialogue}`
    : `ã€éœ€è¦æ€»ç»“çš„å®Œæ•´å¯¹è¯ã€‘\n${dialogue}`;
  if (!config.model) {
    const generateQuietPrompt = runtime.context?.generateQuietPrompt;
    if (typeof generateQuietPrompt !== "function") {
      throw new Error("å½“å‰é…’é¦†ç‰ˆæœ¬ä¸æ”¯æŒè‡ªåŠ¨æ•´ç†åŽ†å²ï¼Œè¯·åœ¨æ’ä»¶é‡Œé…ç½®æ€»ç»“æ¨¡åž‹");
    }
    runtime.summaryRequestActive = true;
    try {
      const content = await generateQuietPrompt({
        quietPrompt: `${config.summaryPrompt}\n\n${userContent}`,
        skipWIAN: true,
        quietName: "LinePhone è®°å¿†æ•´ç†",
        responseLength: 1800,
      });
      if (!String(content || "").trim()) {
        throw new Error("é…’é¦†æ€»ç»“è¯·æ±‚è¿”å›žäº†ç©ºå†…å®¹");
      }
      return String(content).trim();
    } finally {
      runtime.summaryRequestActive = false;
    }
  }
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
  if (!response.ok) throw new Error(`æ€»ç»“ API è¿”å›ž ${response.status}`);
  const payload = await response.json();
  const content =
    payload?.choices?.[0]?.message?.content ||
    payload?.choices?.[0]?.text ||
    payload?.output_text ||
    "";
  if (!String(content).trim()) throw new Error("æ€»ç»“ API è¿”å›žäº†ç©ºå†…å®¹");
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
    throw new Error(payload.code || "Discord ç¤¾åŒºèº«ä»½éªŒè¯å¤±è´¥");
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
    .seïmö¶‰žËkºwµçKšjš^€ˆ(€€€€€€€ôƒ
Üƒ–Â?š&/šrëšïžîL‘íÁ¡½¹•MÕµµ…ÉåI•…‘ä€ü€‹–ÞËšÎ£–”ˆ€è€‹šjš^€‰ôƒ
Üƒ–Â?š&/šrë–º{š^Ø€‘íÁ¡½¹•1¥Ù•½Õ¹Ñôƒšv…€(€€€€€€è€‹¢Þ£ž®¿¢ºÃ–þ¾òkž¶'–úš&O–ò¢žK¢&Ë¢+–’¤ˆì(€ô(€ÉÕ¹Ñ¥µ”¹ÍÕµµ…Éä¹Ù…±Õ”€ôµ•µ½Éäü¹ÍÕµµ…Éäñð€ˆˆì((€½¹ÍÐ±½¥¹	ÕÑÑ½¸€ôÉÕ¹Ñ¥µ”¹Á…¹•°¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ…Ñ¥½¸õ±½¥¹tˆ¤ì(€½¹ÍÐ±½½ÕÑ	ÕÑÑ½¸€ôÉÕ¹Ñ¥µ”¹Á…¹•°¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ…Ñ¥½¸õ±½½ÕÑtˆ¤ì(€½¹ÍÐ½…ÕÑ¡!•±À€ôÉÕ¹Ñ¥µ”¹Á…¹•°¹ÅÕ•ÉåM•±•Ñ½È ˆ¹±Àµ½…ÕÑ µ¡•±Àˆ¤ì(€½¹ÍÐ½…ÕÑ¡1¥¹¬€ô½…ÕÑ¡!•±Àü¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ…Ñ¥½¸õ½…ÕÑ µ±¥¹­tˆ¤ì(€±½¥¹	ÕÑÑ½¸¹¡¥‘‘•¸€ô	½½±•…¸¡ÉÕ¹Ñ¥µ”¹Í•ÍÍ¥½¸¤ì(€±½¥¹	ÕÑÑ½¸¹‘¥Í…‰±•€ôÉÕ¹Ñ¥µ”¹…ÕÑ¡1…Õ¹¡¥¹œì(€±½¥¹	ÕÑÑ½¸¹Ñ•áÑ½¹Ñ•¹Ð€ôÉÕ¹Ñ¥µ”¹…ÕÑ¡1…Õ¹¡¥¹œ€ü€‹š¶–r£š&O–ò ¥Í½É“Š˜ˆ€è€‹’öÿžR ¥Í½Éƒžfï–öTˆì(€±½½ÕÑ	ÕÑÑ½¸¹¡¥‘‘•¸€ô€…ÉÕ¹Ñ¥µ”¹Í•ÍÍ¥½¸ì(€¥˜€¡½…ÕÑ¡!•±À€˜˜½…ÕÑ¡1¥¹¬¤ì(€€€½…ÕÑ¡!•±À¹¡¥‘‘•¸€ô	½½±•…¸¡ÉÕ¹Ñ¥µ”¹Í•ÍÍ¥½¸¤ñð€…ÉÕ¹Ñ¥µ”¹½…ÕÑ¡UÉ°ì(€€€½…ÕÑ¡1¥¹¬¹¡É•˜€ôÉÕ¹Ñ¥µ”¹½…ÕÑ¡UÉ°ñð€ˆŒˆì(€ô((€½¹ÍÐµ½‘•±M•±•Ð€ôÉÕ¹Ñ¥µ”¹Á…¹•°¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ™¥•±õµ½‘•±tˆ¤ì(€µ½‘•±M•±•Ð¹É•Á±…•¡¥±‘É•¸ ¤ì(€½¹ÍÐ•µÁÑä€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰½ÁÑ¥½¸ˆ¤ì(€•µÁÑä¹Ù…±Õ”€ô€ˆˆì(€•µÁÑä¹Ñ•áÑ½¹Ñ•¹Ð€ô½¹™¥œ¹µ½‘•±=ÁÑ¥½¹Ì¹±•¹Ñ €ü€‹¦'š.§š¢‡–z,ˆ€è€‹–#š.'–>[š¢‡–z,ˆì(€µ½‘•±M•±•Ð¹…ÁÁ•¹¡•µÁÑä¤ì(€™½È€¡½¹ÍÐµ½‘•°½˜½¹™¥œ¹µ½‘•±=ÁÑ¥½¹Ì¤ì(€€€½¹ÍÐ½ÁÑ¥½¸€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰½ÁÑ¥½¸ˆ¤ì(€€€½ÁÑ¥½¸¹Ù…±Õ”€ôµ½‘•°ì(€€€½ÁÑ¥½¸¹Ñ•áÑ½¹Ñ•¹Ð€ôµ½‘•°ì(€€€µ½‘•±M•±•Ð¹…ÁÁ•¹¡½ÁÑ¥½¸¤ì(€ô(€µ½‘•±M•±•Ð¹Ù…±Õ”€ô½¹™¥œ¹µ½‘•°ñð€ˆˆì)ô()™Õ¹Ñ¥½¸Í•ÑA…¹•±Y¥Í¥‰±”¡Ù¥Í¥‰±”¤ì(€½¹ÍÐÁ…¹•°€ôÉÕ¹Ñ¥µ”¹Á…¹•°ì(€¥˜€ …Á…¹•°¤É•ÑÕÉ¸ì((€¥˜€ …Ù¥Í¥‰±”¤ì(€€€Á…¹•°¹Í•ÑÑÑÉ¥‰ÕÑ” ‰‘…Ñ„µ½Á•¸ˆ°€‰™…±Í”ˆ¤ì(€€€Á…¹•°¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ¡¥‘‘•¸ˆ°€‰ÑÉÕ”ˆ¤ì(€€€É•ÑÕÉ¸ì(€ô((€Á…¹•°¹Í•ÑÑÑÉ¥‰ÕÑ” ‰‘…Ñ„µ½Á•¸ˆ°€‰ÑÉÕ”ˆ¤ì(€Á…¹•°¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ¡¥‘‘•¸ˆ°€‰™…±Í”ˆ¤ì(€É•¹‘•È ¤ì(€ÕÉÉ•¹Ñ%‘•¹Ñ¥Ñä ¤(€€€€¹Ñ¡•¸ ¡¥‘•¹Ñ¥Ñä¤€ôøì(€€€€€ÉÕ¹Ñ¥µ”¹ÕÉÉ•¹Ð€ô¥‘•¹Ñ¥Ñäì(€€€€€É•¹‘•È ¤ì(€€€ô¤(€€€€¹…Ñ  ¡•ÉÉ½È¤€ôøì(€€€€€ÉÕ¹Ñ¥µ”¹±…ÍÑÉÉ½È€ô•ÉÉ½È¹µ•ÍÍ…”ñð€‹¢¾ï–>[–öO–&7¢+–’§–’Ç¢Ò”ˆì(€€€€€½¹Í½±”¹•ÉÉ½È¡l‘í5=U1õt™…¥±•Ñ¼É•™É•Í Á…¹•±€°•ÉÉ½È¤ì(€€€€€É•¹‘•È ¤ì(€€€ô¤ì)ô()™Õ¹Ñ¥½¸ÍÑ…ÉÑU¥5½¹¥Ñ½È ¤ì(€¥˜€¡ÉÕ¹Ñ¥µ”¹Õ¥=‰Í•ÉÙ•Èñð€…‘½Õµ•¹Ð¹‰½‘ä¤É•ÑÕÉ¸ì(€ÉÕ¹Ñ¥µ”¹Õ¥=‰Í•ÉÙ•È€ô¹•Ü5ÕÑ…Ñ¥½¹=‰Í•ÉÙ•È  ¤€ôøì(€€€¥˜€ …ÉÕ¹Ñ¥µ”¹Á…¹•°ü¹¥Í½¹¹•Ñ•ñð€…ÉÕ¹Ñ¥µ”¹±…Õ¹¡•Èü¹¥Í½¹¹•Ñ•¤ì(€€€€€‰Õ¥±‘U¤ ¤ì(€€€€€É•ÑÕÉ¸ì(€€€ô(€€€µ½Õ¹ÑM•ÑÑ¥¹Í¹ÑÉä ¤ì(€ô¤ì(€ÉÕ¹Ñ¥µ”¹Õ¥=‰Í•ÉÙ•È¹½‰Í•ÉÙ”¡‘½Õµ•¹Ð¹‰½‘ä°ì¡¥±‘1¥ÍÐèÑÉÕ”°ÍÕ‰ÑÉ•”èÑÉÕ”ô¤ì)ô()™Õ¹Ñ¥½¸µ½Õ¹ÑM•ÑÑ¥¹Í¹ÑÉä ¤ì(€¥˜€¡ÉÕ¹Ñ¥µ”¹Í•ÑÑ¥¹Í¹ÑÉäü¹¥Í½¹¹•Ñ•¤É•ÑÕÉ¸ÑÉÕ”ì(€½¹ÍÐ•á¥ÍÑ¥¹œ€ô‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È ˆ±¥¹•Á¡½¹”µÍå¹ŒµÍ•ÑÑ¥¹Ìµ•¹ÑÉäˆ¤ì(€¥˜€¡•á¥ÍÑ¥¹œü¹¥Í½¹¹•Ñ•¤ì(€€€ÉÕ¹Ñ¥µ”¹Í•ÑÑ¥¹Í¹ÑÉä€ô•á¥ÍÑ¥¹œì(€€€É•ÑÕÉ¸ÑÉÕ”ì(€ô(€½¹ÍÐ¡½ÍÐ€ô(€€€‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È ˆ•áÑ•¹Í¥½¹Í}Í•ÑÑ¥¹Ìˆ¤ñð(€€€‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È ˆ•áÑ•¹Í¥½¹Í}Í•ÑÑ¥¹ÌÈˆ¤ì(€¥˜€ …¡½ÍÐ¤ì(€€€±•…ÉQ¥µ•½ÕÐ¡ÉÕ¹Ñ¥µ”¹µ½Õ¹ÑQ¥µ•È¤ì(€€€ÉÕ¹Ñ¥µ”¹µ½Õ¹ÑQ¥µ•È€ôÍ•ÑQ¥µ•½ÕÐ¡µ½Õ¹ÑM•ÑÑ¥¹Í¹ÑÉä°€àÀÀ¤ì(€€€É•ÑÕÉ¸™…±Í”ì(€ô(€±•…ÉQ¥µ•½ÕÐ¡ÉÕ¹Ñ¥µ”¹µ½Õ¹ÑQ¥µ•È¤ì(€ÉÕ¹Ñ¥µ”¹µ½Õ¹ÑQ¥µ•È€ô¹Õ±°ì(€½¹ÍÐ•¹ÑÉä€ô•±•µ•¹Ð (€€€€‰‘¥Øˆ°(€€€€‰•áÑ•¹Í¥½¹}½¹Ñ…¥¹•È±ÀµÍ•ÑÑ¥¹Ìµ•¹ÑÉä±¥¹•Á¡½¹”µÍå¹ŒµÍ•ÑÑ¥¹Ìµ•¹ÑÉäˆ°(€€¤ì(€•¹ÑÉä¹¥€ô€‰±¥¹•Á¡½¹”µÍå¹ŒµÍ•ÑÑ¥¹Ìµ•¹ÑÉäˆì(€•¹ÑÉä¹¥¹¹•É!Q50€ô€(€€€€ñ‘¥Ø±…ÍÌô‰¥¹±¥¹”µ‘É…Ý•Èˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰¥¹±¥¹”µ‘É…Ý•ÈµÑ½±”¥¹±¥¹”µ‘É…Ý•Èµ¡•…‘•Èˆø(€€€€€€€€ñˆù1¥¹•A¡½¹”ƒ–Â?š&/šrë–B3š¶”ð½ˆø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰¥¹±¥¹”µ‘É…Ý•Èµ¥½¸™„µÍ½±¥™„µ¥É±”µ¡•ÙÉ½¸µ‘½Ý¸‘½Ý¸ˆøð½‘¥Øø(€€€€€€ð½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰¥¹±¥¹”µ‘É…Ý•Èµ½¹Ñ•¹Ðˆø(€€€€€€€€ñÀû–B3š¶—–öO–&7¢žK¢&ËŽžîG–ºk’â[žV3’æ›Ž¢+–’§š–ó–Æ–J3¦bÛšº×šïžîOŽð½Àø(€€€€€€€€ñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÌô‰µ•¹Õ}‰ÕÑÑ½¸ˆ‘…Ñ„µ…Ñ¥½¸ô‰½Á•¸µ±¥¹•Á¡½¹”ˆø(€€€€€€€€€ƒš&O–ò–Â?š&/šrë–B3š¶—š:Ÿ–"Û¦v‹švü(€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€ð½‘¥Øø(€€€€ð½‘¥Øø(€€ì(€•¹ÑÉä(€€€€¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ…Ñ¥½¸õ½Á•¸µ±¥¹•Á¡½¹•tˆ¤(€€€€¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€¡•Ù•¹Ð¤€ôøì(€€€€€•Ù•¹Ð¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤ì(€€€€€•Ù•¹Ð¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤ì(€€€€€Í•ÑA…¹•±Y¥Í¥‰±”¡ÑÉÕ”¤ì(€€€ô¤ì(€¡½ÍÐ¹…ÁÁ•¹¡•¹ÑÉä¤ì(€ÉÕ¹Ñ¥µ”¹Í•ÑÑ¥¹Í¹ÑÉä€ô•¹ÑÉäì(€É•ÑÕÉ¸ÑÉÕ”ì)ô()™Õ¹Ñ¥½¸‰Õ¥±‘U¤ ¤ì(€¥˜€¡ÉÕ¹Ñ¥µ”¹Á…¹•°ü¹¥Í½¹¹•Ñ•€˜˜ÉÕ¹Ñ¥µ”¹±…Õ¹¡•Èü¹¥Í½¹¹•Ñ•¤ì(€€€µ½Õ¹ÑM•ÑÑ¥¹Í¹ÑÉä ¤ì(€€€ÍÑ…ÉÑU¥5½¹¥Ñ½È ¤ì(€€€É•ÑÕÉ¸ì(€ô(€½¹ÍÐ•á¥ÍÑ¥¹1…Õ¹¡•È€ô‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È ˆ±¥¹•Á¡½¹”µÍå¹Œµ±…Õ¹¡•Èˆ¤ì(€¥˜€¡ÉÕ¹Ñ¥µ”¹±…Õ¹¡•È€˜˜ÉÕ¹Ñ¥µ”¹±…Õ¹¡•È€„ôô•á¥ÍÑ¥¹1…Õ¹¡•È¤ì(€€€ÉÕ¹Ñ¥µ”¹±…Õ¹¡•È¹É•µ½Ù” ¤ì(€ô(€ÉÕ¹Ñ¥µ”¹Á…¹•°ü¹É•µ½Ù” ¤ì(€½¹ÍÐ‰ÕÑÑ½¸€ô•á¥ÍÑ¥¹1…Õ¹¡•Èñð•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ°€‰±ÀµÍå¹Œµ±…Õ¹¡•Èˆ°€‹Šˆ¤ì(€‰ÕÑÑ½¸¹¥€ô€‰±¥¹•Á¡½¹”µÍå¹Œµ±…Õ¹¡•Èˆì(€‰ÕÑÑ½¸¹ÑåÁ”€ô€‰‰ÕÑÑ½¸ˆì(€‰ÕÑÑ½¸¹Ñ¥Ñ±”€ô€‹–Â?š&/šrë–B3š¶”ˆì(€½¹ÍÐÁ…¹•°€ô•±•µ•¹Ð ‰Í•Ñ¥½¸ˆ°€‰±ÀµÑ…Ù•É¸µÁ…¹•°ˆ¤ì(€Á…¹•°¹¥€ô€‰±¥¹•Á¡½¹”µÍå¹ŒµÁ…¹•°ˆì(€Á…¹•°¹Í•ÑÑÑÉ¥‰ÕÑ” ‰‘…Ñ„µ½Á•¸ˆ°€‰™…±Í”ˆ¤ì(€Á…¹•°¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ¡¥‘‘•¸ˆ°€‰ÑÉÕ”ˆ¤ì(€Á…¹•°¹Í•ÑÑÑÉ¥‰ÕÑ” ‰É½±”ˆ°€‰‘¥…±½œˆ¤ì(€Á…¹•°¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ±…‰•°ˆ°€‹–Â?š&/šrë–B3š¶”ˆ¤ì(€Á…¹•°¹¥¹¹•É!Q50€ô€(€€€€ñ¡•…‘•Èø(€€€€€€ñ‘¥ØøñÍµ…±°ù1%9A!=9I%YHð½Íµ…±°øñ Èû–Â?š&/šrë–B3š¶”ð½ Èøð½‘¥Øø(€€€€€€ñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ‘…Ñ„µ…Ñ¥½¸ô‰±½Í”ˆû\ð½‰ÕÑÑ½¸ø(€€€€ð½¡•…‘•Èø(€€€€ñÀ±…ÍÌô‰±ÀµÍÑ…ÑÕÌˆøð½Àø(€€€€ñÀ±…ÍÌô‰±Àµ‘•Ñ…¥±Ìˆøð½Àø(€€€€ñÀ±…ÍÌô‰±Àµ…ÍÍ•ÑÌˆøð½Àø(€€€€ñÀ±…ÍÌô‰±Àµµ•µ½ÉäµÍÑ…ÑÕÌˆøð½Àø(€€€€ñ‘¥Ø±…ÍÌô‰±Àµ…ÕÑ µ…Ñ¥½¹Ìˆø(€€€€€€ñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ‘…Ñ„µ…Ñ¥½¸ô‰±½¥¸ˆû’öÿžR ¥Í½Éƒžfï–öTð½‰ÕÑÑ½¸ø(€€€€€€ñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ‘…Ñ„µ…Ñ¥½¸ô‰±½½ÕÐˆû¦–ëžfï–öTð½‰ÕÑÑ½¸ø(€€€€ð½‘¥Øø(€€€€ñÀ±…ÍÌô‰±Àµ½…ÕÑ µ¡•±Àˆ¡¥‘‘•¸ø(€€€€€ƒšÊ‡šr'¢«–*£š&O–ò¾ò|(€€€€€€ñ„‘…Ñ„µ…Ñ¥½¸ô‰½…ÕÑ µ±¥¹¬ˆÑ…É•Ðô‰}‰±…¹¬ˆÉ•°ô‰•áÑ•É¹…°¹½½Á•¹•È¹½É•™•ÉÉ•Èˆø(€€€€€€€ƒž
ç¢þg¦3–r£šÖ?¢ž#–f£’â·žîŸžî´¥Í½Éƒžfï–öT(€€€€€€ð½„ø(€€€€ð½Àø(€€€€ñÍ•Ñ¥½¸±…ÍÌô‰±ÀµÍ•Ñ¥½¸±Àµ…Á¤ˆøð½Í•Ñ¥½¸ø(€€€€ñÍ•Ñ¥½¸±…ÍÌô‰±ÀµÍ•Ñ¥½¸ˆø(€€€€€€ñ‘¥Ø±…ÍÌô‰±ÀµÍ•Ñ¥½¸µÑ¥Ñ±”ˆøñÍÑÉ½¹œû–öO–&7¦bÛšº×šïžîLð½ÍÑÉ½¹œøñÍµ…±°û’þw–¶c–r£¢þg’â«¦K¦š–¶cš†šr³–rÀð½Íµ…±°øð½‘¥Øø(€€€€€€ñÑ•áÑ…É•„±…ÍÌô‰±ÀµÍÕµµ…ÉäˆÉ½ÝÌôˆàˆÁ±…•¡½±‘•Èô‹¢úû–"ÃšïžîOš–ó–Æ–B;¢«–*£žRš"C¾ò3’æ–>¿’î—š&/–*£žò[¢úDˆøð½Ñ•áÑ…É•„ø(€€€€€€ñ‘¥Ø±…ÍÌô‰±ÀµÉ½Üˆø(€€€€€€€€ñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ‘…Ñ„µ…Ñ¥½¸ô‰Í…Ù”µÍÕµµ…Éäˆû’þw–¶c–æÛ¢šžn[’êGž®¼ð½‰ÕÑÑ½¸ø(€€€€€€€€ñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ‘…Ñ„µ…Ñ¥½¸ô‰Íå¹Œµ¹½Üˆûž®/–6Ï¢¾ï–>[–æÛ–B3š¶”ð½‰ÕÑÑ½¸ø(€€€€€€ð½‘¥Øø(€€€€ð½Í•Ñ¥½¸ø(€€ì(€¥˜€ …‰ÕÑÑ½¸¹¥Í½¹¹•Ñ•¤‘½Õµ•¹Ð¹‰½‘ä¹…ÁÁ•¹¡‰ÕÑÑ½¸¤ì(€‘½Õµ•¹Ð¹‰½‘ä¹…ÁÁ•¹¡Á…¹•°¤ì(€ÉÕ¹Ñ¥µ”¹±…Õ¹¡•È€ô‰ÕÑÑ½¸ì(€ÉÕ¹Ñ¥µ”¹Á…¹•°€ôÁ…¹•°ì(€ÉÕ¹Ñ¥µ”¹ÍÑ…ÑÕÌ€ôÁ…¹•°¹ÅÕ•ÉåM•±•Ñ½È ˆ¹±ÀµÍÑ…ÑÕÌˆ¤ì(€ÉÕ¹Ñ¥µ”¹‘•Ñ…¥±Ì€ôÁ…¹•°¹ÅÕ•ÉåM•±•Ñ½È ˆ¹±Àµ‘•Ñ…¥±Ìˆ¤ì(€ÉÕ¹Ñ¥µ”¹…ÍÍ•ÑÌ€ôÁ…¹•°¹ÅÕ•ÉåM•±•Ñ½È ˆ¹±Àµ…ÍÍ•ÑÌˆ¤ì(€ÉÕ¹Ñ¥µ”¹µ•µ½ÉåMÑ…ÑÕÌ€ôÁ…¹•°¹ÅÕ•ÉåM•±•Ñ½È ˆ¹±Àµµ•µ½ÉäµÍÑ…ÑÕÌˆ¤ì(€ÉÕ¹Ñ¥µ”¹ÍÕµµ…Éä€ôÁ…¹•°¹ÅÕ•ÉåM•±•Ñ½È ˆ¹±ÀµÍÕµµ…Éäˆ¤ì(€µ½Õ¹ÑM•ÑÑ¥¹Í¹ÑÉä ¤ì(€ÍÑ…ÉÑU¥5½¹¥Ñ½È ¤ì((€½¹ÍÐ½¹™¥œ€ôÍ•ÑÑ¥¹Ì ¤ì(€½¹ÍÐ…Á¤€ôÁ…¹•°¹ÅÕ•ÉåM•±•Ñ½È ˆ¹±Àµ…Á¤ˆ¤ì(€½¹ÍÐ…Á¥UÉ°€ô¥¹ÁÕÑ½È ‰ÕÉ°ˆ°½¹™¥œ¹…Á¥UÉ°°€¡Ù…±Õ”¤€ôøì(€€€Í•ÑÑ¥¹Ì ¤¹…Á¥UÉ°€ôÙ…±Õ”¹ÑÉ¥´ ¤ì(€€€Í…Ù•M•ÑÑ¥¹Ì ¤ì(€ô¤ì(€½¹ÍÐ…Á¥-•ä€ô¥¹ÁÕÑ½È (€€€€‰Á…ÍÍÝ½Éˆ°(€€€ÍÑ½É…••Ð¡A%}-e}MQ=I¤°(€€€€¡Ù…±Õ”¤€ôøÍÑ½É…•M•Ð¡A%}-e}MQ=I°Ù…±Õ”¤°(€€¤ì(€½¹ÍÐµ½‘•°€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰Í•±•Ðˆ¤ì(€µ½‘•°¹‘…Ñ…Í•Ð¹™¥•±€ô€‰µ½‘•°ˆì(€µ½‘•°¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°€ ¤€ôøì(€€€Í•ÑÑ¥¹Ì ¤¹µ½‘•°€ôµ½‘•°¹Ù…±Õ”ì(€€€Í…Ù•M•ÑÑ¥¹Ì ¤ì(€€€Í¡•‘Õ±•AÉ½•ÍÌ¡ì™½É•UÁ±½…èÑÉÕ”°…±±½ÝMÕµµ…ÉäèÑÉÕ”ô¤ì(€ô¤ì(€½¹ÍÐ¥¹Ñ•ÉÙ…°€ô¥¹ÁÕÑ½È ‰¹Õµ‰•Èˆ°½¹™¥œ¹¥¹Ñ•ÉÙ…°°€¡Ù…±Õ”¤€ôøì(€€€Í•ÑÑ¥¹Ì ¤¹¥¹Ñ•ÉÙ…°€ô5…Ñ ¹µ¥¸ ÈÀÀ°5…Ñ ¹µ…à È°9Õµ‰•È¡Ù…±Õ”¤ñð€ÈÀ¤¤ì(€€€Í…Ù•M•ÑÑ¥¹Ì ¤ì(€€€Í¡•‘Õ±•AÉ½•ÍÌ¡ì™½É•UÁ±½…èÑÉÕ”°…±±½ÝMÕµµ…ÉäèÑÉÕ”ô¤ì(€ô¤ì(€¥¹Ñ•ÉÙ…°¹µ¥¸€ô€ˆÈˆì(€¥¹Ñ•ÉÙ…°¹µ…à€ô€ˆÈÀÀˆì(€½¹ÍÐ…ÕÑ¼€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰¥¹ÁÕÐˆ¤ì(€…ÕÑ¼¹ÑåÁ”€ô€‰¡•­‰½àˆì(€…ÕÑ¼¹¡•­•€ô½¹™¥œ¹…ÕÑ½MÕµµ…É¥é”ì(€…ÕÑ¼¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°€ ¤€ôøì(€€€Í•ÑÑ¥¹Ì ¤¹…ÕÑ½MÕµµ…É¥é”€ô…ÕÑ¼¹¡•­•ì(€€€Í…Ù•M•ÑÑ¥¹Ì ¤ì(€€€Í¡•‘Õ±•AÉ½•ÍÌ¡ì™½É•UÁ±½…èÑÉÕ”°…±±½ÝMÕµµ…ÉäèÑÉÕ”ô¤ì(€ô¤ì(€½¹ÍÐÁÕ±°€ô•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ°€ˆˆ°€‹š.'–>[š¢‡–z,ˆ¤ì(€ÁÕ±°¹ÑåÁ”€ô€‰‰ÕÑÑ½¸ˆì(€ÁÕ±°¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôø(€€€ÁÕ±±5½‘•±Ì ¤¹…Ñ  ¡•ÉÉ½È¤€ôøì(€€€€€ÉÕ¹Ñ¥µ”¹±…ÍÑÉÉ½È€ô•ÉÉ½È¹µ•ÍÍ…”ì(€€€€€É•¹‘•È ¤ì(€€€ô¤°(€€¤ì(€½¹ÍÐµ½‘•±I½Ü€ô•±•µ•¹Ð ‰‘¥Øˆ°€‰±Àµµ½‘•°µÉ½Üˆ¤ì(€µ½‘•±I½Ü¹…ÁÁ•¹¡µ½‘•°°ÁÕ±°¤ì(€…Á¤¹…ÁÁ•¹ (€€€•±•µ•¹Ð ‰‘¥Øˆ°€‰±ÀµÍ•Ñ¥½¸µÑ¥Ñ±”ˆ°€‹¢«–*£šïžîLA$ˆ¤°(€€€™¥•± ‰A$ƒ–rÃ–v ˆ°…Á¥UÉ°¤°(€€€™¥•± ‰A$-•ç¾ò#–>«–¶c–öO–&7šÖ?¢ž#–f£¾ò$ˆ°…Á¥-•ä¤°(€€€™¥•± ‹š¢‡–z,ˆ°µ½‘•±I½Ü¤°(€€€™¥•± ‹š¾?–’k–ÂGš–óšïžîO’âš²„ˆ°¥¹Ñ•ÉÙ…°¤°(€€€™¥•± ‹–B¿žR£¢«–*£šïžîLˆ°…ÕÑ¼¤°(€€¤ì((€¥˜€ (€€€‰ÕÑÑ½¸¹‘…Ñ…Í•Ð¹±¥¹•Á¡½¹•	½½ÑÍÑÉ…Á	½Õ¹€„ôô€‰ÑÉÕ”ˆ€˜˜(€€€‰ÕÑÑ½¸¹‘…Ñ…Í•Ð¹±¥¹•Á¡½¹•ÁÁ	½Õ¹€„ôô€‰ÑÉÕ”ˆ(€€¤ì(€€€‰ÕÑÑ½¸¹‘…Ñ…Í•Ð¹±¥¹•Á¡½¹•ÁÁ	½Õ¹€ô€‰ÑÉÕ”ˆì(€€€‰ÕÑÑ½¸¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøì(€€€€€Í•ÑA…¹•±Y¥Í¥‰±”¡Á…¹•°¹•ÑÑÑÉ¥‰ÕÑ” ‰‘…Ñ„µ½Á•¸ˆ¤€„ôô€‰ÑÉÕ”ˆ¤ì(€€€ô¤ì(€ô(€Á…¹•°¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ…Ñ¥½¸õ±½Í•tˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøì(€€€Í•ÑA…¹•±Y¥Í¥‰±”¡™…±Í”¤ì(€ô¤ì(€Á…¹•°¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ…Ñ¥½¸õ±½¥¹tˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°±½¥¸¤ì(€Á…¹•°¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ…Ñ¥½¸õ±½½ÕÑtˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°±½½ÕÐ¤ì(€Á…¹•°¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ…Ñ¥½¸õÍå¹Œµ¹½Ýtˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôø(€€€ÁÉ½•ÍÍÕÉÉ•¹Ð¡ì™½É•UÁ±½…èÑÉÕ”°…±±½ÝMÕµµ…ÉäèÑÉÕ”°É•™É•Í¡ÍÍ•ÑÌèÑÉÕ”ô¤°(€€¤ì(€Á…¹•°¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ…Ñ¥½¸õÍ…Ù”µÍÕµµ…Éåtˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°…Íå¹Œ€ ¤€ôøì(€€€½¹ÍÐ¥‘•¹Ñ¥Ñä€ô…Ý…¥ÐÕÉÉ•¹Ñ%‘•¹Ñ¥Ñä ¤ì(€€€¥˜€ …¥‘•¹Ñ¥Ñä¤É•ÑÕÉ¸ì(€€€½¹ÍÐµ•µ½Éä€ô•ÑM…Ù•5•µ½Éä¡¥‘•¹Ñ¥Ñä¹½¹Ñ•áÐ¤ì(€€€½¹ÍÐÉ½Õ¹‘Ì€ô‰Õ¥±‘I½Õ¹‘Ì¡¥‘•¹Ñ¥Ñä¹½¹Ñ•áÐ¹¡…Ð¤ì(€€€½¹ÍÐ¥¹Ñ•ÉÙ…°€ô5…Ñ ¹µ¥¸ ÈÀÀ°5…Ñ ¹µ…à È°9Õµ‰•È¡Í•ÑÑ¥¹Ì ¤¹¥¹Ñ•ÉÙ…°¤ñð€ÈÀ¤¤ì(€€€½¹ÍÐÑ…É•Ñ	½Õ¹‘…Éä€ô5…Ñ ¹™±½½È¡É½Õ¹‘Ì¹±•¹Ñ €¼¥¹Ñ•ÉÙ…°¤€¨¥¹Ñ•ÉÙ…°ì(€€€µ•µ½Éä¹ÍÕµµ…Éä€ôÉÕ¹Ñ¥µ”¹ÍÕµµ…Éä¹Ù…±Õ”¹ÑÉ¥´ ¤ì(€€€µ•µ½Éä¹½Ù•É•‘Q¡É½Õ €ôÑ…É•Ñ	½Õ¹‘…Éäì(€€€µ•µ½Éä¹Í½ÕÉ•!…Í €ôÑ…É•Ñ	½Õ¹‘…Éä(€€€€€€ü…Ý…¥ÐÍ¡„ÈÔØ¡)M=8¹ÍÑÉ¥¹¥™ä¡É½Õ¹‘Ì¹Í±¥” À°Ñ…É•Ñ	½Õ¹‘…Éä¤¤¤(€€€€€€è€ˆˆì(€€€µ•µ½Éä¹ÍÕµµ…ÉåMÑ…±”€ô™…±Í”ì(€€€µ•µ½Éä¹µ…¹Õ…±±å‘¥Ñ•‘Ð€ô…Ñ”¹¹½Ü ¤ì(€€€µ•µ½Éä¹ÕÁ‘…Ñ•‘Ð€ô…Ñ”¹¹½Ü ¤ì(€€€Í…Ù•M…Ù•5•µ½Éä¡¥‘•¹Ñ¥Ñä¹½¹Ñ•áÐ¤ì(€€€…Ý…¥ÐÁÉ½•ÍÍÕÉÉ•¹Ð¡ì™½É•UÁ±½…èÑÉÕ”°…±±½ÝMÕµµ…Éäè™…±Í”ô¤ì(€ô¤ì(€É•¹‘•È ¤ì)ô()…Íå¹Œ™Õ¹Ñ¥½¸ÁÉ•Á…É•	•™½É••¹•É…Ñ¥½¸ ¤ì(€¥˜€¡ÉÕ¹Ñ¥µ”¹ÍÕµµ…ÉåI•ÅÕ•ÍÑÑ¥Ù”ñð€…Í•ÑÑ¥¹Ì ¤¹•¹…‰±•¤É•ÑÕÉ¸ì(€½¹ÍÐ‘•…‘±¥¹”€ô…Ñ”¹¹½Ü ¤€¬€ØÀÀÀÀì(€Ý¡¥±”€¡ÉÕ¹Ñ¥µ”¹‰ÕÍä€˜˜…Ñ”¹¹½Ü ¤€ð‘•…‘±¥¹”¤ì(€€€…Ý…¥Ð¹•ÜAÉ½µ¥Í” ¡É•Í½±Ù”¤€ôøÍ•ÑQ¥µ•½ÕÐ¡É•Í½±Ù”°€ÔÀ¤¤ì(€ô(€¥˜€¡ÉÕ¹Ñ¥µ”¹‰ÕÍäñðÉÕ¹Ñ¥µ”¹ÍÕµµ…ÉåI•ÅÕ•ÍÑÑ¥Ù”¤É•ÑÕÉ¸ì(€…Ý…¥ÐÁÉ½•ÍÍÕÉÉ•¹Ð¡ì™½É•UÁ±½…èÑÉÕ”°…±±½ÝMÕµµ…ÉäèÑÉÕ”ô¤ì)ô()™Õ¹Ñ¥½¸‰¥¹‘Ù•¹ÑÌ ¤ì(€¥˜€¡ÉÕ¹Ñ¥µ”¹•Ù•¹ÑÍ	½Õ¹¤É•ÑÕÉ¸ÑÉÕ”ì(€½¹ÍÐ•Ù•¹ÑM½ÕÉ”€ôÉÕ¹Ñ¥µ”¹½¹Ñ•áÐü¹•Ù•¹ÑM½ÕÉ”ì(€½¹ÍÐ•Ù•¹ÑQåÁ•Ì€ôÉÕ¹Ñ¥µ”¹½¹Ñ•áÐü¹•Ù•¹ÑQåÁ•Ìì(€¥˜€¡ÑåÁ•½˜•Ù•¹ÑM½ÕÉ”ü¹½¸€„ôô€‰™Õ¹Ñ¥½¸ˆñð€…•Ù•¹ÑQåÁ•Ì¤É•ÑÕÉ¸™…±Í”ì(€½¹ÍÐÝ…Ñ¡•€ôl(€€€•Ù•¹ÑQåÁ•Ì¹5MM}M9P°(€€€•Ù•¹ÑQåÁ•Ì¹5MM}I%Y°(€€€•Ù•¹ÑQåÁ•Ì¹5MM}%Q°(€€€•Ù•¹ÑQåÁ•Ì¹5MM}1Q°(€€€•Ù•¹ÑQåÁ•Ì¹5MM}UAQ°(€€€•Ù•¹ÑQåÁ•Ì¹5MM}M]%A°(€€€•Ù•¹ÑQåÁ•Ì¹9IQ%=9}9°(€t¹™¥±Ñ•È¡	½½±•…¸¤ì(€Ý…Ñ¡•¹™½É…  ¡•Ù•¹Ð¤€ôø•Ù•¹ÑM½ÕÉ”¹½¸¡•Ù•¹Ð°€ ¤€ôøÍ¡•‘Õ±•AÉ½•ÍÌ ¤¤¤ì(€¥˜€¡•Ù•¹ÑQåÁ•Ì¹9IQ%=9}QI}=559L¤ì(€€€•Ù•¹ÑM½ÕÉ”¹½¸¡•Ù•¹ÑQåÁ•Ì¹9IQ%=9}QI}=559L°ÁÉ•Á…É•	•™½É••¹•É…Ñ¥½¸¤ì(€ô(€½¹ÍÐ…ÍÍ•ÑÙ•¹ÑÌ€ôl(€€€•Ù•¹ÑQåÁ•Ì¹!IQI}%Q°(€€€•Ù•¹ÑQåÁ•Ì¹!IQI}M1Q°(€€€•Ù•¹ÑQåÁ•Ì¹]=I1%9=}UAQ°(€€€•Ù•¹ÑQåÁ•Ì¹]=I1%9=}MQQ%9M}UAQ°(€t¹™¥±Ñ•È¡	½½±•…¸¤ì(€…ÍÍ•ÑÙ•¹ÑÌ¹™½É…  ¡•Ù•¹Ð¤€ôø(€€€•Ù•¹ÑM½ÕÉ”¹½¸¡•Ù•¹Ð°€ ¤€ôø(€€€€€Í¡•‘Õ±•AÉ½•ÍÌ¡ì™½É•UÁ±½…èÑÉÕ”°É•™É•Í¡ÍÍ•ÑÌèÑÉÕ”ô¤°(€€€€¤°(€€¤ì(€¥˜€¡•Ù•¹ÑQåÁ•Ì¹!Q}!9¤ì(€€€•Ù•¹ÑM½ÕÉ”¹½¸¡•Ù•¹ÑQåÁ•Ì¹!Q}!9°€ ¤€ôøì(€€€€€±•…ÉM¡…É•‘5•µ½ÉåAÉ½µÁÐ ¤ì(€€€€€Í¡•‘Õ±•AÉ½•ÍÌ¡ì™½É•UÁ±½…èÑÉÕ”°É•™É•Í¡ÍÍ•ÑÌèÑÉÕ”ô¤ì(€€€ô¤ì(€ô(€ÉÕ¹Ñ¥µ”¹•Ù•¹ÑÍ	½Õ¹€ôÑÉÕ”ì(€É•ÑÕÉ¸ÑÉÕ”ì)ô()™Õ¹Ñ¥½¸•¹ÍÕÉ•Ù•¹ÑÍ	½Õ¹ ¤ì(€¥˜€¡‰¥¹‘Ù•¹ÑÌ ¤¤ì(€€€±•…ÉQ¥µ•½ÕÐ¡ÉÕ¹Ñ¥µ”¹•Ù•¹ÑÍQ¥µ•È¤ì(€€€ÉÕ¹Ñ¥µ”¹•Ù•¹ÑÍQ¥µ•È€ô¹Õ±°ì(€€€É•ÑÕÉ¸ì(€ô(€±•…ÉQ¥µ•½ÕÐ¡ÉÕ¹Ñ¥µ”¹•Ù•¹ÑÍQ¥µ•È¤ì(€ÉÕ¹Ñ¥µ”¹•Ù•¹ÑÍQ¥µ•È€ôÍ•ÑQ¥µ•½ÕÐ  ¤€ôøì(€€€ÑÉäì(€€€€€ÉÕ¹Ñ¥µ”¹½¹Ñ•áÐ€ôÕÉÉ•¹Ñ½¹Ñ•áÐ ¤ì(€€€€€•¹ÍÕÉ•Ù•¹ÑÍ	½Õ¹ ¤ì(€€€ô…Ñ €¡•ÉÉ½È¤ì(€€€€€½¹Í½±”¹‘•‰Õœ¡l‘í5=U1õtÝ…¥Ñ¥¹œ™½ÈM¥±±åQ…Ù•É¸•Ù•¹ÑÍ€°•ÉÉ½È¤ì(€€€€€•¹ÍÕÉ•Ù•¹ÑÍ	½Õ¹ ¤ì(€€€ô(€ô°€àÀÀ¤ì)ô()…Íå¹Œ™Õ¹Ñ¥½¸¥¹¥Ñ¥…±¥é•ÕÑ  ¤ì(€ÍÕÁ…‰…Í”¹…ÕÑ ¹½¹ÕÑ¡MÑ…Ñ•¡…¹” ¡}•Ù•¹Ð°Í•ÍÍ¥½¸¤€ôøì(€€€Í•ÑQ¥µ•½ÕÐ¡…Íå¹Œ€ ¤€ôøì(€€€€€ÉÕ¹Ñ¥µ”¹Í•ÍÍ¥½¸€ôÍ•ÍÍ¥½¸ì(€€€€€ÉÕ¹Ñ¥µ”¹ÁÉ½™¥±”€ô¹Õ±°ì(€€€€€ÉÕ¹Ñ¥µ”¹½¹¹•Ñ•€ô™…±Í”ì(€€€€€¥˜€¡Í•ÍÍ¥½¸¤ÉÕ¹Ñ¥µ”¹½…ÕÑ¡UÉ°€ô€ˆˆì(€€€€€¥˜€ …Í•ÍÍ¥½¸¤ì(€€€€€€€É•¹‘•È ¤ì(€€€€€€€É•ÑÕÉ¸ì(€€€€€ô(€€€€€ÑÉäì(€€€€€€€¥˜€¡Í•ÍÍ¥½¸¹ÁÉ½Ù¥‘•É}Ñ½­•¸¤…Ý…¥ÐÙ•É¥™å¥Í½É¡Í•ÍÍ¥½¸¤ì(€€€€€€€½¹ÍÐì‘…Ñ„ô€ô…Ý…¥ÐÍÕÁ…‰…Í”¹…ÕÑ ¹•ÑM•ÍÍ¥½¸ ¤ì(€€€€€€€ÉÕ¹Ñ¥µ”¹Í•ÍÍ¥½¸€ô‘…Ñ„¹Í•ÍÍ¥½¸ì(€€€€€€€…Ý…¥Ð±½…‘AÉ½™¥±” ¤ì(€€€€€€€¥˜€¡¡…Í•ÍÌ ¤¤ì(€€€€€€€€€…Ý…¥ÐÉ•¥ÍÑ•É•Ù¥” ¤ì(€€€€€€€€€…Ý…¥Ð±½…‘I•Ù¥Í¥½¹Ì ¤ì(€€€€€€€€€ÉÕ¹Ñ¥µ”¹½¹¹•Ñ•€ôÑÉÕ”ì(€€€€€€€€€Í¡•‘Õ±•AÉ½•ÍÌ¡ì™½É•UÁ±½…èÑÉÕ”°É•™É•Í¡ÍÍ•ÑÌèÑÉÕ”ô¤ì(€€€€€€€ô(€€€€€ô…Ñ €¡•ÉÉ½È¤ì(€€€€€€€ÉÕ¹Ñ¥µ”¹±…ÍÑÉÉ½È€ô•ÉÉ½È¹µ•ÍÍ…”ì(€€€€€ô(€€€€€É•¹‘•È ¤ì(€€€ô°€À¤ì(€ô¤ì(€½¹ÍÐì‘…Ñ„ô€ô…Ý…¥ÐÍÕÁ…‰…Í”¹…ÕÑ ¹•ÑM•ÍÍ¥½¸ ¤ì(€ÉÕ¹Ñ¥µ”¹Í•ÍÍ¥½¸€ô‘…Ñ„¹Í•ÍÍ¥½¸ì(€¥˜€¡ÉÕ¹Ñ¥µ”¹Í•ÍÍ¥½¸¤ì(€€€…Ý…¥Ð±½…‘AÉ½™¥±” ¤¹…Ñ  ¡•ÉÉ½È¤€ôøì(€€€€€ÉÕ¹Ñ¥µ”¹±…ÍÑÉÉ½È€ô•ÉÉ½È¹µ•ÍÍ…”ì(€€€ô¤ì(€€€¥˜€¡¡…Í•ÍÌ ¤¤ì(€€€€€…Ý…¥ÐÉ•¥ÍÑ•É•Ù¥” ¤ì(€€€€€…Ý…¥Ð±½…‘I•Ù¥Í¥½¹Ì ¤ì(€€€€€ÉÕ¹Ñ¥µ”¹½¹¹•Ñ•€ôÑÉÕ”ì(€€€ô(€ô)ô()…Íå¹Œ™Õ¹Ñ¥½¸Ý…¥Ñ½ÉM¥±±åQ…Ù•É¸¡Ñ¥µ•½ÕÑ5Ì€ô€ÄÔÀÀÀ¤ì(€½¹ÍÐÍÑ…ÉÑ•‘Ð€ô…Ñ”¹¹½Ü ¤ì(€Ý¡¥±”€ …±½‰…±Q¡¥Ì¹M¥±±åQ…Ù•É¸ü¹•Ñ½¹Ñ•áÐñð€…‘½Õµ•¹Ð¹‰½‘ä¤ì(€€€¥˜€¡…Ñ”¹¹½Ü ¤€´ÍÑ…ÉÑ•‘Ð€øÑ¥µ•½ÕÑ5Ì¤ì(€€€€€Ñ¡É½Ü¹•ÜÉÉ½È ‹ž¶'–úM¥±±åQ…Ù•É¸ƒ–"w–ž/–2[¢Úš^Øˆ¤ì(€€€ô(€€€…Ý…¥Ð¹•ÜAÉ½µ¥Í” ¡É•Í½±Ù”¤€ôøÍ•ÑQ¥µ•½ÕÐ¡É•Í½±Ù”°€ÄÀÀ¤¤ì(€ô)ô()…Íå¹Œ™Õ¹Ñ¥½¸•¹ÍÕÉ•U¥5½Õ¹Ñ• ¤ì(€…Ý…¥ÐÝ…¥Ñ½ÉM¥±±åQ…Ù•É¸ ¤ì(€ÉÕ¹Ñ¥µ”¹½¹Ñ•áÐ€ôÕÉÉ•¹Ñ½¹Ñ•áÐ ¤ì(€‰Õ¥±‘U¤ ¤ì)ô()…Íå¹Œ™Õ¹Ñ¥½¸¥¹¥Ð ¤ì(€¥˜€¡ÉÕ¹Ñ¥µ”¹¥¹¥Ñ¥…±¥é•¤É•ÑÕÉ¸ì(€…Ý…¥Ð•¹ÍÕÉ•U¥5½Õ¹Ñ• ¤ì(€ÉÕ¹Ñ¥µ”¹¥¹¥Ñ¥…±¥é•€ôÑÉÕ”ì(€Í•ÑÑ¥¹Ì ¤ì(€ÉÕ¹Ñ¥µ”¹‘•Ù¥”€ô•Ñ•Ù¥” ¤ì(€•¹ÍÕÉ•Ù•¹ÑÍ	½Õ¹ ¤ì(€ÑÉäì(€€€…Ý…¥Ð¥¹¥Ñ¥…±¥é•ÕÑ  ¤ì(€ô…Ñ €¡•ÉÉ½È¤ì(€€€ÉÕ¹Ñ¥µ”¹±…ÍÑÉÉ½È€ô•ÉÉ½È¹µ•ÍÍ…”ñð€‹žfï–öWž*Ûš–"w–ž/–2[–’Ç¢Ò”ˆì(€€€½¹Í½±”¹•ÉÉ½È¡l‘í5=U1õt…ÕÑ ¥¹¥Ñ¥…±¥é…Ñ¥½¸™…¥±•‘€°•ÉÉ½È¤ì(€€€É•¹‘•È ¤ì(€ô(€Í¡•‘Õ±•AÉ½•ÍÌ¡ì™½É•UÁ±½…èÑÉÕ”°É•™É•Í¡ÍÍ•ÑÌèÑÉÕ”ô¤ì(€½¹Í½±”¹±½œ¡l‘í5=U1õtØ‘íYIM%=9ô±½…‘•‘€¤ì)ô()±•Ð¥¹¥ÑAÉ½µ¥Í”€ô¹Õ±°ì()™Õ¹Ñ¥½¸•¹ÍÕÉ•%¹¥Ñ¥…±¥é• ¤ì(€¥¹¥ÑAÉ½µ¥Í”ñðô¥¹¥Ð ¤¹…Ñ  ¡•ÉÉ½È¤€ôøì(€€€ÉÕ¹Ñ¥µ”¹¥¹¥Ñ¥…±¥é•€ô™…±Í”ì(€€€½¹Í½±”¹•ÉÉ½È¡l‘í5=U1õt¥¹¥Ñ¥…±¥é…Ñ¥½¸™…¥±•‘€°•ÉÉ½È¤ì(€€€ÉÕ¹Ñ¥µ”¹±…ÍÑÉÉ½È€ô•ÉÉ½È¹µ•ÍÍ…”ñð€‹–"w–ž/–2[–’Ç¢Ò”ˆì(€€€É•¹‘•È ¤ì(€€€Ñ¡É½Ü•ÉÉ½Èì(€ô¤ì(€É•ÑÕÉ¸¥¹¥ÑAÉ½µ¥Í”ì)ô()•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸½¹Ñ¥Ù…Ñ” ¤ì(€…Ý…¥Ð•¹ÍÕÉ•U¥5½Õ¹Ñ• ¤ì(€É•ÑÕÉ¸•¹ÍÕÉ•%¹¥Ñ¥…±¥é• ¤ì)ô()•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸½¹¹…‰±” ¤ì(€…Ý…¥Ð•¹ÍÕÉ•U¥5½Õ¹Ñ• ¤ì(€É•ÑÕÉ¸•¹ÍÕÉ•%¹¥Ñ¥…±¥é• ¤ì)ô()•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸½Á•¹A…¹•° ¤ì(€…Ý…¥Ð•¹ÍÕÉ•U¥5½Õ¹Ñ• ¤ì(€Í•ÑA…¹•±Y¥Í¥‰±”¡ÑÉÕ”¤ì)ô()AÉ½µ¥Í”¹É•Í½±Ù” ¤¹Ñ¡•¸  ¤€ôøì(€•¹ÍÕÉ•%¹¥Ñ¥…±¥é• ¤¹…Ñ   ¤€ôøì(€€€€¼¼Q¡”±¥™•å±”¡½½¬µ…äÉ•ÑÉä¥¹¥Ñ¥…±¥é…Ñ¥½¸…™Ñ•ÈÑ¡”…ÁÀ¥ÌÉ•…‘ä¸(€€€¥¹¥ÑAÉ½µ¥Í”€ô¹Õ±°ì(€ô¤ì)ô¤ì(