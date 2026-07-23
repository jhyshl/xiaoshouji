"use strict";

const DB_NAME = "linephone-db";
const DB_VERSION = 1;
const STORE_NAME = "app";
const STATE_KEY = "state";

const DEFAULT_STATE = {
  schemaVersion: 1,
  currentCharacterId: null,
  characters: [],
  worldBooks: [],
  chats: {},
  settings: {
    apiUrl: "https://api.openai.com/v1/chat/completions",
    apiKey: "",
    model: "gpt-4.1-mini",
    temperature: 0.8,
    maxTokens: 500,
    playerName: "你",
  },
};

let state = structuredClone(DEFAULT_STATE);
let activeView = "home";
let pendingMessages = [];
let sending = false;
let saveTimer = null;
let toastTimer = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  state = mergeState(await readState());
  bindEvents();
  fillSettingsForm();
  updateClock();
  setInterval(updateClock, 30_000);
  renderAll();
  registerServiceWorker();
}

function mergeState(saved) {
  if (!saved || typeof saved !== "object") return structuredClone(DEFAULT_STATE);
  return {
    ...structuredClone(DEFAULT_STATE),
    ...saved,
    characters: Array.isArray(saved.characters) ? saved.characters : [],
    worldBooks: Array.isArray(saved.worldBooks) ? saved.worldBooks : [],
    chats: saved.chats && typeof saved.chats === "object" ? saved.chats : {},
    settings: { ...DEFAULT_STATE.settings, ...(saved.settings || {}) },
  };
}

function bindEvents() {
  $$("[data-go]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.go));
  });

  $("#home-settings").addEventListener("click", () => navigate("settings"));
  $("#contact-search").addEventListener("input", renderContacts);
  $("#character-file").addEventListener("change", importCharacter);
  $("#worldbook-file").addEventListener("change", importWorldBook);
  $("#restore-backup").addEventListener("change", restoreBackup);
  $("#quick-backup").addEventListener("click", exportBackup);
  $("#export-backup").addEventListener("click", exportBackup);
  $("#api-form").addEventListener("submit", saveSettings);
  $("#test-api").addEventListener("click", testConnection);
  $("#composer").addEventListener("submit", sendPendingBatch);
  $("#stage-message").addEventListener("click", stageCurrentMessage);
  $("#clear-pending").addEventListener("click", clearPending);
  $("#clear-chat").addEventListener("click", clearCurrentChat);
  $("#message-input").addEventListener("input", autoGrowComposer);
  $("#message-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      stageCurrentMessage();
    }
  });

  window.addEventListener("beforeunload", () => {
    if (saveTimer) clearTimeout(saveTimer);
    writeState(state);
  });
}

function navigate(view) {
  const target = $(`[data-view="${view}"]`);
  if (!target) return;
  activeView = view;
  $$(".view").forEach((panel) => panel.classList.toggle("active", panel === target));
  $$(".bottom-nav button").forEach((button) => {
    const navView = button.dataset.go;
    const isActive = navView === view || (view === "chat" && navView === "contacts");
    button.classList.toggle("active", isActive);
  });
  if (view === "chat") renderChat();
  if (view === "contacts") renderContacts();
  if (view === "library") renderLibrary();
  if (view === "settings") fillSettingsForm();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAll() {
  renderHome();
  renderContacts();
  renderLibrary();
  renderChat();
}

function renderHome() {
  const host = $("#home-contacts");
  if (!state.characters.length) {
    host.innerHTML = `<div class="empty-state"><p>还没有联系人<br>从“导入”加入第一张角色卡</p></div>`;
  } else {
    host.innerHTML = state.characters
      .slice()
      .sort((a, b) => lastActivity(b.id) - lastActivity(a.id))
      .slice(0, 5)
      .map(
        (character) => `
          <button class="contact-chip" data-character="${escapeAttr(character.id)}" type="button">
            ${avatarMarkup(character)}
            <strong>${escapeHtml(character.name)}</strong>
          </button>`,
      )
      .join("");
    $$("[data-character]", host).forEach((button) => {
      button.addEventListener("click", () => openChat(button.dataset.character));
    });
  }

  const selected = currentCharacter();
  $("#hero-subtitle").textContent = selected
    ? `${selected.name} 的记忆与聊天已保存在本机。`
    : "多条消息会合并为一次请求，回复仍保持一句一个气泡。";
}

function renderContacts() {
  const query = ($("#contact-search").value || "").trim().toLowerCase();
  const characters = state.characters
    .filter((item) => item.name.toLowerCase().includes(query))
    .sort((a, b) => lastActivity(b.id) - lastActivity(a.id));
  const host = $("#contact-list");

  if (!characters.length) {
    host.innerHTML = `
      <div class="empty-state">
        <span>○</span>
        <p>${query ? "没有找到这个角色" : "导入酒馆角色卡后<br>联系人会出现在这里"}</p>
      </div>`;
    return;
  }

  host.innerHTML = characters
    .map((character) => {
      const messages = state.chats[character.id] || [];
      const last = messages.at(-1);
      return `
        <button class="contact-row" data-contact="${escapeAttr(character.id)}" type="button">
          ${avatarMarkup(character)}
          <span class="contact-meta">
            <strong>${escapeHtml(character.name)}</strong>
            <small>${escapeHtml(last?.content || character.description || "开始一段新对话")}</small>
          </span>
          <time class="contact-time">${last ? formatRelative(last.createdAt) : "NEW"}</time>
        </button>`;
    })
    .join("");

  $$("[data-contact]", host).forEach((button) => {
    button.addEventListener("click", () => openChat(button.dataset.contact));
  });
}

function renderLibrary() {
  $("#character-total").textContent = `${state.characters.length} 个`;
  $("#worldbook-total").textContent = `${state.worldBooks.length} 本`;

  const charactersHost = $("#character-library");
  charactersHost.innerHTML = state.characters.length
    ? state.characters
        .map(
          (character) => `
          <div class="library-row">
            <span class="library-symbol">${character.avatar ? `<img src="${escapeAttr(character.avatar)}" alt="" />` : escapeHtml(initialOf(character.name))}</span>
            <span class="library-info">
              <strong>${escapeHtml(character.name)}</strong>
              <small>${character.sourceFormat === "png" ? "PNG 角色卡" : "JSON 角色卡"} · ${(state.chats[character.id] || []).length} 条消息</small>
            </span>
            <span class="row-actions">
              <button data-open-character="${escapeAttr(character.id)}" type="button" aria-label="打开聊天">↗</button>
              <button data-delete-character="${escapeAttr(character.id)}" type="button" aria-label="删除角色">×</button>
            </span>
          </div>`,
        )
        .join("")
    : `<div class="empty-state"><p>尚未导入角色卡</p></div>`;

  const booksHost = $("#worldbook-library");
  booksHost.innerHTML = state.worldBooks.length
    ? state.worldBooks
        .map(
          (book) => `
          <div class="library-row">
            <span class="library-symbol">⌘</span>
            <span class="library-info">
              <strong>${escapeHtml(book.name)}</strong>
              <small>${book.entries.length} 个可用条目${book.characterId ? " · 角色内嵌" : ""}</small>
            </span>
            <span class="row-actions">
              <button data-toggle-book="${escapeAttr(book.id)}" type="button" aria-label="启用或停用世界书">${book.enabled ? "●" : "○"}</button>
              <button data-delete-book="${escapeAttr(book.id)}" type="button" aria-label="删除世界书">×</button>
            </span>
          </div>`,
        )
        .join("")
    : `<div class="empty-state"><p>尚未导入世界书</p></div>`;

  $$("[data-open-character]", charactersHost).forEach((button) => {
    button.addEventListener("click", () => openChat(button.dataset.openCharacter));
  });
  $$("[data-delete-character]", charactersHost).forEach((button) => {
    button.addEventListener("click", () => deleteCharacter(button.dataset.deleteCharacter));
  });
  $$("[data-toggle-book]", booksHost).forEach((button) => {
    button.addEventListener("click", () => toggleBook(button.dataset.toggleBook));
  });
  $$("[data-delete-book]", booksHost).forEach((button) => {
    button.addEventListener("click", () => deleteBook(button.dataset.deleteBook));
  });
}

function openChat(characterId) {
  const character = state.characters.find((item) => item.id === characterId);
  if (!character) return;
  state.currentCharacterId = characterId;
  pendingMessages = [];
  scheduleSave();
  renderAll();
  navigate("chat");
  setTimeout(() => $("#message-input").focus(), 120);
}

function renderChat() {
  const character = currentCharacter();
  const list = $("#message-list");
  if (!character) {
    $("#chat-name").textContent = "未选择角色";
    $("#chat-status").textContent = "请先导入角色卡";
    $("#chat-avatar").textContent = "L";
    list.innerHTML = `<div class="empty-state"><span>○</span><p>从联系人列表选择一个角色</p></div>`;
    renderPending();
    return;
  }

  $("#chat-name").textContent = character.name;
  $("#chat-status").textContent = `${matchedWorldBookCount(character.id)} 本世界书 · 本地记忆`;
  $("#chat-avatar").innerHTML = character.avatar
    ? `<img src="${escapeAttr(character.avatar)}" alt="" />`
    : escapeHtml(initialOf(character.name));

  const messages = state.chats[character.id] || [];
  list.innerHTML = messages.length
    ? messages
        .map(
          (message) => `
          <div class="message-group ${message.role === "user" ? "user" : "assistant"}">
            <div class="bubble">
              ${escapeHtml(message.content).replaceAll("\n", "<br>")}
              <time>${formatTime(message.createdAt)}</time>
            </div>
          </div>`,
        )
        .join("")
    : `<div class="empty-state"><span>○</span><p>还没有消息<br>可以先连续暂存几条再统一发送</p></div>`;

  renderPending();
  requestAnimationFrame(() => {
    list.scrollTop = list.scrollHeight;
  });
}

function stageCurrentMessage() {
  if (sending) return;
  const input = $("#message-input");
  const content = input.value.trim();
  if (!content) {
    showToast("先写下一条消息");
    return;
  }
  if (!currentCharacter()) {
    showToast("请先选择一个角色");
    navigate("contacts");
    return;
  }
  pendingMessages.push({ id: createId("pending"), content });
  input.value = "";
  autoGrowComposer();
  renderPending();
  input.focus();
}

function renderPending() {
  const tray = $("#pending-tray");
  tray.hidden = pendingMessages.length === 0;
  $("#pending-count").textContent = `待发送 ${pendingMessages.length} 条`;
  $("#pending-list").innerHTML = pendingMessages
    .map(
      (message) => `
      <div class="pending-item">
        <span>${escapeHtml(message.content).replaceAll("\n", "<br>")}</span>
        <button data-remove-pending="${escapeAttr(message.id)}" type="button" aria-label="撤回这条消息">×</button>
      </div>`,
    )
    .join("");
  $$("[data-remove-pending]", $("#pending-list")).forEach((button) => {
    button.addEventListener("click", () => {
      pendingMessages = pendingMessages.filter((item) => item.id !== button.dataset.removePending);
      renderPending();
    });
  });
}

function clearPending() {
  pendingMessages = [];
  renderPending();
}

async function sendPendingBatch(event) {
  event.preventDefault();
  if (sending) return;
  const input = $("#message-input");
  if (input.value.trim()) stageCurrentMessage();
  if (!pendingMessages.length) {
    showToast("至少暂存一条消息");
    return;
  }
  const character = currentCharacter();
  if (!character) {
    showToast("请先选择一个角色");
    return;
  }

  const batch = pendingMessages.map((item) => item.content);
  pendingMessages = [];
  const now = Date.now();
  const chat = (state.chats[character.id] ||= []);
  batch.forEach((content, index) => {
    chat.push({
      id: createId("msg"),
      role: "user",
      content,
      createdAt: now + index,
      source: "phone",
    });
  });
  scheduleSave();
  renderAll();
  setSending(true);

  try {
    const replies = await requestCharacterReply(character, batch);
    const replyTime = Date.now();
    replies.forEach((content, index) => {
      chat.push({
        id: createId("msg"),
        role: "assistant",
        content,
        createdAt: replyTime + index,
        source: "ai",
      });
    });
    scheduleSave();
    renderAll();
  } catch (error) {
    showToast(humanizeApiError(error));
  } finally {
    setSending(false);
    renderChat();
  }
}

function setSending(value) {
  sending = value;
  $("#typing-line").hidden = !value;
  $("#send-batch").disabled = value;
  $("#stage-message").disabled = value;
  $("#message-input").disabled = value;
}

async function requestCharacterReply(character, batch) {
  const settings = state.settings;
  if (!settings.apiUrl || !settings.model) throw new Error("API_NOT_CONFIGURED");

  const chat = state.chats[character.id] || [];
  const historyBeforeBatch = chat.slice(0, Math.max(0, chat.length - batch.length)).slice(-36);
  const memoryText = [...batch, ...historyBeforeBatch.slice(-8).map((item) => item.content)].join("\n");
  const lore = collectLore(character.id, memoryText);
  const systemPrompt = buildSystemPrompt(character, lore);

  const messages = [
    { role: "system", content: systemPrompt },
    ...historyBeforeBatch.map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: item.content,
    })),
    {
      role: "user",
      content: batch.map((item, index) => `【第 ${index + 1} 条】${item}`).join("\n"),
    },
  ];

  const response = await fetch(normalizeEndpoint(settings.apiUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      temperature: Number(settings.temperature) || 0.8,
      max_tokens: Number(settings.maxTokens) || 500,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = new Error(`HTTP_${response.status}`);
    error.detail = detail.slice(0, 300);
    throw error;
  }

  const payload = await response.json();
  const content =
    payload?.choices?.[0]?.message?.content ??
    payload?.choices?.[0]?.text ??
    payload?.output_text ??
    "";
  const replies = parseReplies(content);
  if (!replies.length) throw new Error("EMPTY_REPLY");
  return replies;
}

function buildSystemPrompt(character, loreEntries) {
  const playerName = state.settings.playerName || "你";
  const profile = [
    character.description && `角色设定：${character.description}`,
    character.personality && `性格：${character.personality}`,
    character.scenario && `当前场景：${character.scenario}`,
    character.mesExample && `说话示例：\n${character.mesExample}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const lore = loreEntries.length
    ? `\n\n【相关世界书】\n${loreEntries.map((item) => `- ${item.content}`).join("\n")}`
    : "";

  return `你正在扮演“${character.name}”，与玩家“${playerName}”进行手机即时聊天。

${profile || "保持角色卡所描述的人格与关系。"}${lore}

【必须遵守的回复格式】
1. 先理解玩家连续发送的全部消息，再统一回应。
2. 像真实手机聊天一样简短自然，优先回复 2～6 句。
3. 每个数组元素只能放一句话，不得在同一个元素里写两句话。
4. 不写旁白、动作描写、姓名前缀或长段落，除非角色设定明确要求。
5. 只输出合法 JSON，不要 Markdown：
{"replies":["第一句","第二句","第三句"]}`;
}

function collectLore(characterId, text) {
  const lower = text.toLowerCase();
  return state.worldBooks
    .filter((book) => book.enabled && (!book.characterId || book.characterId === characterId))
    .flatMap((book) => book.entries)
    .filter((entry) => {
      if (!entry.enabled) return false;
      if (entry.constant) return true;
      return entry.keys.some((key) => key && lower.includes(key.toLowerCase()));
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 24);
}

function parseReplies(rawContent) {
  let raw = typeof rawContent === "string" ? rawContent.trim() : "";
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let candidates = [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) candidates = parsed;
    else if (Array.isArray(parsed?.replies)) candidates = parsed.replies;
    else if (Array.isArray(parsed?.messages)) candidates = parsed.messages;
    else if (typeof parsed?.reply === "string") candidates = [parsed.reply];
  } catch {
    candidates = raw
      .split(/\n+/)
      .map((line) => line.replace(/^\s*[-*•\d.)、]+\s*/, ""))
      .filter(Boolean);
  }

  return candidates
    .flatMap((item) => splitSentences(String(item || "")))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function splitSentences(text) {
  const cleaned = text
    .replace(/^["“”']+|["“”']+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  const matches = cleaned.match(/[^。！？!?…]+(?:[。！？!?]+|…{1,2}|$)/g);
  return (matches || [cleaned]).map((item) => item.trim()).filter(Boolean);
}

async function importCharacter(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  try {
    let raw;
    let avatar = "";
    let sourceFormat = "json";
    if (file.type === "image/png" || file.name.toLowerCase().endsWith(".png")) {
      const buffer = await file.arrayBuffer();
      raw = parsePngCharacter(buffer);
      avatar = await fileToDataUrl(file);
      sourceFormat = "png";
    } else {
      raw = JSON.parse(await file.text());
    }
    const character = normalizeCharacter(raw, { avatar, sourceFormat, fileName: file.name });
    const existing = state.characters.findIndex(
      (item) => item.name.toLowerCase() === character.name.toLowerCase(),
    );
    if (existing >= 0) {
      const old = state.characters[existing];
      character.id = old.id;
      state.characters.splice(existing, 1, character);
    } else {
      state.characters.push(character);
    }
    state.currentCharacterId = character.id;
    state.chats[character.id] ||= [];
    if (!state.chats[character.id].length && character.firstMes) {
      splitSentences(character.firstMes).forEach((content, index) => {
        state.chats[character.id].push({
          id: createId("msg"),
          role: "assistant",
          content,
          createdAt: Date.now() + index,
          source: "card",
        });
      });
    }

    const embedded = raw?.data?.character_book || raw?.character_book || raw?.data?.world_book;
    if (embedded) {
      const book = normalizeWorldBook(embedded, `${character.name} · 内嵌世界书`, character.id);
      const priorIndex = state.worldBooks.findIndex(
        (item) => item.characterId === character.id && item.embedded,
      );
      book.embedded = true;
      if (priorIndex >= 0) state.worldBooks.splice(priorIndex, 1, book);
      else state.worldBooks.push(book);
    }

    scheduleSave();
    renderAll();
    showToast(`已导入角色：${character.name}`);
  } catch (error) {
    console.error(error);
    showToast(error.message === "PNG_CARD_NOT_FOUND" ? "这张 PNG 中没有找到酒馆角色卡数据" : "角色卡读取失败，请确认文件格式");
  }
}

function normalizeCharacter(raw, meta = {}) {
  const data = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  if (!data || typeof data !== "object" || !String(data.name || "").trim()) {
    throw new Error("INVALID_CHARACTER");
  }
  return {
    id: createId("char"),
    name: String(data.name).trim(),
    description: String(data.description || data.char_persona || "").trim(),
    personality: String(data.personality || data.persona || "").trim(),
    scenario: String(data.scenario || data.world_scenario || "").trim(),
    firstMes: String(data.first_mes || data.first_message || data.greeting || "").trim(),
    mesExample: String(data.mes_example || data.example_dialogue || "").trim(),
    systemPrompt: String(data.system_prompt || "").trim(),
    postHistoryInstructions: String(data.post_history_instructions || "").trim(),
    creatorNotes: String(data.creator_notes || raw?.creator_notes || "").trim(),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    avatar: meta.avatar || "",
    sourceFormat: meta.sourceFormat || "json",
    sourceFile: meta.fileName || "",
    importedAt: Date.now(),
  };
}

function parsePngCharacter(buffer) {
  const bytes = new Uint8Array(buffer);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((value, index) => bytes[index] === value)) {
    throw new Error("INVALID_PNG");
  }
  const decoder = new TextDecoder("latin1");
  let offset = 8;
  const textValues = new Map();

  while (offset + 12 <= bytes.length) {
    const length =
      ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>>
      0;
    const type = decoder.decode(bytes.slice(offset + 4, offset + 8));
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > bytes.length) break;
    const chunk = bytes.slice(start, end);

    if (type === "tEXt") {
      const zero = chunk.indexOf(0);
      if (zero > 0) {
        const key = decoder.decode(chunk.slice(0, zero));
        const value = decoder.decode(chunk.slice(zero + 1));
        textValues.set(key, value);
      }
    } else if (type === "iTXt") {
      const zero = chunk.indexOf(0);
      if (zero > 0) {
        const key = decoder.decode(chunk.slice(0, zero));
        let cursor = zero + 1;
        const compressionFlag = chunk[cursor++];
        cursor += 1;
        for (let field = 0; field < 2; field += 1) {
          while (cursor < chunk.length && chunk[cursor] !== 0) cursor += 1;
          cursor += 1;
        }
        if (compressionFlag === 0) {
          textValues.set(key, new TextDecoder().decode(chunk.slice(cursor)));
        }
      }
    }
    offset = end + 4;
    if (type === "IEND") break;
  }

  const encoded = textValues.get("chara") || textValues.get("ccv3") || textValues.get("character");
  if (!encoded) throw new Error("PNG_CARD_NOT_FOUND");
  const decoded = decodeBase64Utf8(encoded);
  return JSON.parse(decoded);
}

async function importWorldBook(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    const book = normalizeWorldBook(raw, file.name.replace(/\.json$/i, ""));
    state.worldBooks.push(book);
    scheduleSave();
    renderAll();
    showToast(`已导入世界书：${book.name}`);
  } catch (error) {
    console.error(error);
    showToast("世界书读取失败，请确认 JSON 格式");
  }
}

function normalizeWorldBook(raw, fallbackName = "未命名世界书", characterId = null) {
  const sourceEntries = raw?.entries ?? raw?.data?.entries ?? raw;
  const list = Array.isArray(sourceEntries)
    ? sourceEntries
    : sourceEntries && typeof sourceEntries === "object"
      ? Object.values(sourceEntries)
      : [];
  const entries = list
    .map((entry, index) => ({
      id: String(entry.uid ?? entry.id ?? index),
      keys: normalizeKeys(entry.key ?? entry.keys ?? entry.keywords),
      secondaryKeys: normalizeKeys(entry.keysecondary ?? entry.secondary_keys),
      content: String(entry.content ?? entry.text ?? "").trim(),
      constant: Boolean(entry.constant ?? entry.always_active ?? false),
      enabled: !(entry.disable ?? entry.disabled ?? false),
      priority: Number(entry.order ?? entry.priority ?? entry.insertion_order ?? 0),
      comment: String(entry.comment ?? entry.name ?? "").trim(),
    }))
    .filter((entry) => entry.content);

  if (!entries.length) throw new Error("INVALID_WORLDBOOK");
  return {
    id: createId("book"),
    name: String(raw?.name || raw?.title || fallbackName),
    entries,
    enabled: true,
    characterId,
    importedAt: Date.now(),
  };
}

function normalizeKeys(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[,，|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function toggleBook(bookId) {
  const book = state.worldBooks.find((item) => item.id === bookId);
  if (!book) return;
  book.enabled = !book.enabled;
  scheduleSave();
  renderLibrary();
  showToast(book.enabled ? "世界书已启用" : "世界书已停用");
}

function deleteBook(bookId) {
  const book = state.worldBooks.find((item) => item.id === bookId);
  if (!book || !window.confirm(`删除世界书“${book.name}”？`)) return;
  state.worldBooks = state.worldBooks.filter((item) => item.id !== bookId);
  scheduleSave();
  renderAll();
  showToast("世界书已删除");
}

function deleteCharacter(characterId) {
  const character = state.characters.find((item) => item.id === characterId);
  if (!character || !window.confirm(`删除“${character.name}”及其本地聊天？`)) return;
  state.characters = state.characters.filter((item) => item.id !== characterId);
  state.worldBooks = state.worldBooks.filter((item) => item.characterId !== characterId);
  delete state.chats[characterId];
  if (state.currentCharacterId === characterId) {
    state.currentCharacterId = state.characters[0]?.id || null;
  }
  scheduleSave();
  renderAll();
  showToast("角色与本地聊天已删除");
}

function clearCurrentChat() {
  const character = currentCharacter();
  if (!character || !window.confirm(`清空与“${character.name}”的全部聊天？`)) return;
  state.chats[character.id] = [];
  pendingMessages = [];
  scheduleSave();
  renderAll();
  showToast("聊天已清空");
}

function fillSettingsForm() {
  $("#api-url").value = state.settings.apiUrl || "";
  $("#api-key").value = state.settings.apiKey || "";
  $("#api-model").value = state.settings.model || "";
  $("#api-temperature").value = state.settings.temperature ?? 0.8;
  $("#api-max-tokens").value = state.settings.maxTokens ?? 500;
  $("#player-name").value = state.settings.playerName || "你";
}

function saveSettings(event) {
  event.preventDefault();
  state.settings = readSettingsForm();
  scheduleSave();
  showToast("AI 设置已保存在本机");
}

function readSettingsForm() {
  return {
    apiUrl: $("#api-url").value.trim(),
    apiKey: $("#api-key").value.trim(),
    model: $("#api-model").value.trim(),
    temperature: Math.min(2, Math.max(0, Number($("#api-temperature").value) || 0.8)),
    maxTokens: Math.min(4096, Math.max(64, Number($("#api-max-tokens").value) || 500)),
    playerName: $("#player-name").value.trim() || "你",
  };
}

async function testConnection() {
  const button = $("#test-api");
  const dot = $("#connection-dot");
  const previous = button.textContent;
  button.disabled = true;
  button.textContent = "测试中…";
  dot.className = "connection-dot";
  const settings = readSettingsForm();

  try {
    const response = await fetch(normalizeEndpoint(settings.apiUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [{ role: "user", content: "只回复 OK" }],
        max_tokens: 8,
        temperature: 0,
      }),
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    dot.classList.add("ok");
    showToast("连接成功，可以开始聊天");
  } catch (error) {
    dot.classList.add("fail");
    showToast(humanizeApiError(error));
  } finally {
    button.disabled = false;
    button.textContent = previous;
  }
}

function exportBackup() {
  const backup = structuredClone(state);
  backup.settings.apiKey = "";
  backup.exportedAt = new Date().toISOString();
  backup.product = "LinePhone";
  downloadJson(`linephone-backup-${dateStamp()}.json`, backup);
  showToast("备份已导出，API Key 未包含");
}

async function restoreBackup(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    const incoming = mergeState(JSON.parse(await file.text()));
    const currentKey = state.settings.apiKey;
    state = incoming;
    if (!state.settings.apiKey) state.settings.apiKey = currentKey;
    pendingMessages = [];
    await writeState(state);
    fillSettingsForm();
    renderAll();
    showToast("备份恢复完成");
  } catch (error) {
    console.error(error);
    showToast("备份文件无法读取");
  }
}

function normalizeEndpoint(url) {
  const clean = String(url || "").trim().replace(/\/+$/, "");
  if (!clean) throw new Error("API_NOT_CONFIGURED");
  if (/\/chat\/completions$/i.test(clean)) return clean;
  if (/\/v1$/i.test(clean)) return `${clean}/chat/completions`;
  return `${clean}/v1/chat/completions`;
}

function humanizeApiError(error) {
  const message = String(error?.message || error || "");
  if (message === "API_NOT_CONFIGURED") return "请先在设置中填写 API 地址和模型";
  if (message === "EMPTY_REPLY") return "AI 返回了空内容，请重试";
  if (message.includes("401") || message.includes("403")) return "认证失败，请检查 API Key";
  if (message.includes("404")) return "接口地址或模型名称不正确";
  if (message.includes("429")) return "请求过于频繁或额度不足";
  if (message.includes("500") || message.includes("502") || message.includes("503")) return "AI 服务暂时不可用";
  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    return "网络或跨域连接失败，请检查 API 地址";
  }
  return `发送失败：${message.slice(0, 80) || "未知错误"}`;
}

function currentCharacter() {
  return state.characters.find((item) => item.id === state.currentCharacterId) || null;
}

function matchedWorldBookCount(characterId) {
  return state.worldBooks.filter(
    (book) => book.enabled && (!book.characterId || book.characterId === characterId),
  ).length;
}

function lastActivity(characterId) {
  return state.chats[characterId]?.at(-1)?.createdAt || 0;
}

function avatarMarkup(character) {
  return `<span class="avatar">${
    character.avatar
      ? `<img src="${escapeAttr(character.avatar)}" alt="" />`
      : escapeHtml(initialOf(character.name))
  }</span>`;
}

function initialOf(name) {
  return Array.from(String(name || "L").trim())[0]?.toUpperCase() || "L";
}

function createId(prefix) {
  if (crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function formatRelative(timestamp) {
  const elapsed = Date.now() - Number(timestamp || 0);
  if (elapsed < 60_000) return "刚刚";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m`;
  if (elapsed < 86_400_000) return formatTime(timestamp);
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(
    new Date(timestamp),
  );
}

function updateClock() {
  $("#clock").textContent = formatTime(Date.now());
}

function dateStamp() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
}

function autoGrowComposer() {
  const input = $("#message-input");
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 112)}px`;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function decodeBase64Utf8(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function downloadJson(fileName, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => writeState(state), 160);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readState() {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn("IndexedDB read failed", error);
    return null;
  }
}

async function writeState(nextState) {
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(nextState, STATE_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  } catch (error) {
    console.warn("IndexedDB save failed", error);
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.warn("Service worker registration failed", error);
      });
    });
  }
}

