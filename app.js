"use strict";

const DB_NAME = "linephone-db";
const DB_VERSION = 1;
const STORE_NAME = "app";
const STATE_KEY = "state";

const DEFAULT_REPLY_RULES = `【回复格式要求】
1. 先理解玩家本轮连续发送的全部气泡，再统一回应。
2. 像真实手机聊天一样简短自然，优先回复 2～6 句。
3. 每个数组元素只能放一句话，不得在同一个元素里写两句话。
4. 不写姓名前缀；除非角色设定明确要求，否则不写长段旁白。
5. 只输出合法 JSON，不要 Markdown：
{"replies":["第一句","第二句","第三句"]}`;

const DEFAULT_SYSTEM_PROMPT = `你正在扮演“{{char}}”，与玩家“{{user}}”进行手机即时聊天。

【玩家人设】
{{player_persona}}

【角色卡】
{{character_card}}

【相关世界书】
{{worldbook}}

{{reply_rules}}`;

const DEFAULT_STATE = {
  schemaVersion: 2,
  currentCharacterId: null,
  characters: [],
  worldBooks: [],
  chats: {},
  profile: {
    name: "你",
    persona: "",
    avatar: "",
  },
  settings: {
    apiUrl: "https://api.openai.com/v1/chat/completions",
    apiKey: "",
    model: "",
    modelOptions: [],
    temperature: 0.8,
    maxTokens: 500,
    contextTurns: 12,
    systemPromptTemplate: DEFAULT_SYSTEM_PROMPT,
  },
};

let state = structuredClone(DEFAULT_STATE);
let activeView = "home";
let sending = false;
let saveTimer = null;
let toastTimer = null;
let longPressTimer = null;
let pendingCharacterAvatar = "";
let editingWorldBookDraft = null;

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
  navigate("home");
  registerServiceWorker();
}

function mergeState(saved) {
  if (!saved || typeof saved !== "object") return structuredClone(DEFAULT_STATE);

  const legacyPlayerName = saved.settings?.playerName;
  const merged = {
    ...structuredClone(DEFAULT_STATE),
    ...saved,
    characters: Array.isArray(saved.characters) ? saved.characters : [],
    worldBooks: Array.isArray(saved.worldBooks) ? saved.worldBooks : [],
    chats: saved.chats && typeof saved.chats === "object" ? saved.chats : {},
    profile: {
      ...DEFAULT_STATE.profile,
      ...(saved.profile || {}),
      name: saved.profile?.name || legacyPlayerName || DEFAULT_STATE.profile.name,
    },
    settings: {
      ...DEFAULT_STATE.settings,
      ...(saved.settings || {}),
      contextTurns: clampNumber(saved.settings?.contextTurns, 0, 200, 12),
      modelOptions: Array.isArray(saved.settings?.modelOptions) ? saved.settings.modelOptions : [],
      systemPromptTemplate:
        saved.settings?.systemPromptTemplate || DEFAULT_SYSTEM_PROMPT,
    },
  };

  merged.schemaVersion = 2;
  Object.entries(merged.chats).forEach(([characterId, messages]) => {
    if (!Array.isArray(messages)) {
      merged.chats[characterId] = [];
      return;
    }
    merged.chats[characterId] = messages.map((message) => ({
      ...message,
      id: message.id || createId("msg"),
      turnId: message.turnId || `legacy_${message.id || createId("turn")}`,
      queued: Boolean(message.queued),
    }));
  });
  merged.worldBooks = merged.worldBooks.map((book) => ({
    ...book,
    enabled: book.enabled !== false,
    entries: Array.isArray(book.entries)
      ? book.entries.map((entry) => ({
          ...entry,
          enabled: entry.enabled !== false,
          constant: Boolean(entry.constant),
          priority: Number(entry.priority) || 0,
          keys: Array.isArray(entry.keys) ? entry.keys : normalizeKeys(entry.keys),
          secondaryKeys: Array.isArray(entry.secondaryKeys) ? entry.secondaryKeys : [],
        }))
      : [],
  }));
  return merged;
}

function bindEvents() {
  $$("[data-go]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.go));
  });
  $$("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => closeModal(button.dataset.closeModal));
  });
  $$(".modal-layer").forEach((layer) => {
    layer.addEventListener("click", (event) => {
      if (event.target === layer) closeModal(layer.id);
    });
  });

  $("#contact-search").addEventListener("input", renderContacts);
  $("#character-file").addEventListener("change", importCharacter);
  $("#worldbook-file").addEventListener("change", importWorldBook);
  $("#restore-backup").addEventListener("change", restoreBackup);
  $("#quick-backup").addEventListener("click", exportBackup);
  $("#export-backup").addEventListener("click", exportBackup);

  $("#settings-form").addEventListener("submit", saveSettings);
  $("#fetch-models").addEventListener("click", fetchModels);
  $("#player-avatar-file").addEventListener("change", updatePlayerAvatar);
  $("#reset-prompt").addEventListener("click", resetPromptTemplate);
  $("#preview-prompt").addEventListener("click", previewFinalPrompt);

  $("#composer").addEventListener("submit", stageCurrentMessage);
  $("#confirm-send-ai").addEventListener("click", confirmQueuedMessages);
  $("#message-input").addEventListener("input", autoGrowComposer);
  $("#chat-settings").addEventListener("click", () => {
    const character = currentCharacter();
    if (character) openCharacterEditor(character.id);
  });
  $("#chat-person").addEventListener("click", () => {
    const character = currentCharacter();
    if (character) openCharacterEditor(character.id);
  });

  $("#character-form").addEventListener("submit", saveCharacterEdits);
  $("#character-avatar-file").addEventListener("change", updateCharacterAvatarDraft);
  $("#remove-character-avatar").addEventListener("click", removeCharacterAvatarDraft);

  $("#worldbook-form").addEventListener("submit", saveWorldBookEdits);
  $("#add-worldbook-entry").addEventListener("click", addWorldBookEntry);
  $("#worldbook-entry-list").addEventListener("input", updateWorldBookEntryDraft);
  $("#worldbook-entry-list").addEventListener("change", updateWorldBookEntryDraft);
  $("#worldbook-entry-list").addEventListener("click", handleWorldBookEntryClick);

  $("#message-form").addEventListener("submit", saveMessageEdit);
  $("#delete-message").addEventListener("click", deleteEditedMessage);

  $("#home-contact-open").addEventListener("click", () => {
    const character = currentCharacter() || recentCharacter();
    if (character) openChat(character.id);
    else navigate("library");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const openLayer = $$(".modal-layer").find((layer) => !layer.hidden);
      if (openLayer) closeModal(openLayer.id);
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
  $(".bottom-nav").classList.toggle("home-hidden", view === "home");

  if (view === "home") renderHome();
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
  const character = currentCharacter() || recentCharacter();
  $("#home-contact-name").textContent = character?.name || "尚未导入角色";
  if (character) {
    const last = (state.chats[character.id] || []).at(-1);
    $("#home-contact-note").textContent = last?.content || "点击开始聊天";
    $("#today-subtitle").textContent = `${character.name} 的资料和记忆已保存在当前设备。`;
  } else {
    $("#home-contact-note").textContent = "到资料库导入角色卡";
    $("#today-subtitle").textContent = "消息先进入聊天，再由你决定何时交给 AI。";
  }
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
        <p>${query ? "没有找到这个角色" : "导入角色卡后<br>联系人会出现在这里"}</p>
      </div>`;
    return;
  }

  host.innerHTML = characters
    .map((character) => {
      const messages = state.chats[character.id] || [];
      const last = messages.at(-1);
      const queuedCount = queuedMessages(character.id).length;
      return `
        <button class="contact-row" data-contact="${escapeAttr(character.id)}" type="button">
          ${avatarMarkup(character)}
          <span class="contact-meta">
            <strong>${escapeHtml(character.name)}</strong>
            <small>${escapeHtml(
              queuedCount
                ? `${queuedCount} 个气泡待交给 AI`
                : last?.content || character.description || "开始一段新对话",
            )}</small>
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
            <span class="library-symbol">${
              character.avatar
                ? `<img src="${escapeAttr(character.avatar)}" alt="" />`
                : escapeHtml(initialOf(character.name))
            }</span>
            <span class="library-info">
              <strong>${escapeHtml(character.name)}</strong>
              <small>${character.sourceFormat === "png" ? "PNG 角色卡" : "JSON 角色卡"} · 可编辑 · ${
                (state.chats[character.id] || []).length
              } 个气泡</small>
            </span>
            <span class="row-actions">
              <button data-edit-character="${escapeAttr(character.id)}" type="button">编辑</button>
              <button data-open-character="${escapeAttr(character.id)}" type="button">聊天</button>
              <button data-delete-character="${escapeAttr(character.id)}" type="button" aria-label="删除角色">×</button>
            </span>
          </div>`,
        )
        .join("")
    : `<div class="empty-state"><p>尚未导入角色卡</p></div>`;

  const booksHost = $("#worldbook-library");
  booksHost.innerHTML = state.worldBooks.length
    ? state.worldBooks
        .map((book) => {
          const enabledEntries = book.entries.filter((entry) => entry.enabled).length;
          return `
          <div class="library-row">
            <span class="library-symbol">⌘</span>
            <span class="library-info">
              <strong>${escapeHtml(book.name)}</strong>
              <small>${enabledEntries}/${book.entries.length} 个条目启用${book.characterId ? " · 角色内嵌" : ""}</small>
            </span>
            <span class="row-actions">
              <button data-edit-book="${escapeAttr(book.id)}" type="button">编辑</button>
              <button data-toggle-book="${escapeAttr(book.id)}" type="button" aria-label="启用或停用世界书">${
                book.enabled ? "开" : "关"
              }</button>
              <button data-delete-book="${escapeAttr(book.id)}" type="button" aria-label="删除世界书">×</button>
            </span>
          </div>`;
        })
        .join("")
    : `<div class="empty-state"><p>尚未导入世界书</p></div>`;

  $$("[data-open-character]", charactersHost).forEach((button) => {
    button.addEventListener("click", () => openChat(button.dataset.openCharacter));
  });
  $$("[data-edit-character]", charactersHost).forEach((button) => {
    button.addEventListener("click", () => openCharacterEditor(button.dataset.editCharacter));
  });
  $$("[data-delete-character]", charactersHost).forEach((button) => {
    button.addEventListener("click", () => deleteCharacter(button.dataset.deleteCharacter));
  });
  $$("[data-edit-book]", booksHost).forEach((button) => {
    button.addEventListener("click", () => openWorldBookEditor(button.dataset.editBook));
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
  scheduleSave();
  renderAll();
  navigate("chat");
  setTimeout(() => $("#message-input").focus(), 100);
}

function renderChat() {
  const character = currentCharacter();
  const list = $("#message-list");
  if (!character) {
    $("#chat-name").textContent = "未选择角色";
    $("#chat-status").textContent = "请先导入角色卡";
    $("#chat-avatar").textContent = "L";
    list.innerHTML = `<div class="empty-state"><span>○</span><p>从消息列表选择一个角色</p></div>`;
    renderQueueConfirm();
    return;
  }

  $("#chat-name").textContent = character.name;
  $("#chat-status").textContent = `在线 · ${matchedWorldBookCount(character.id)} 本世界书`;
  $("#chat-avatar").innerHTML = character.avatar
    ? `<img src="${escapeAttr(character.avatar)}" alt="" />`
    : escapeHtml(initialOf(character.name));

  const messages = state.chats[character.id] || [];
  list.innerHTML = messages.length
    ? messages
        .map((message) => {
          const avatar =
            message.role === "user"
              ? state.profile.avatar
              : character.avatar;
          const avatarName =
            message.role === "user"
              ? state.profile.name || "你"
              : character.name;
          return `
          <div class="message-group ${message.role === "user" ? "user" : "assistant"}">
            ${
              message.role === "assistant"
                ? `<span class="message-avatar">${miniAvatarMarkup(avatar, avatarName)}</span>`
                : ""
            }
            <div
              class="bubble ${message.queued ? "queued" : ""}"
              data-message-id="${escapeAttr(message.id)}"
              role="button"
              tabindex="0"
              aria-label="长按编辑或删除这条消息"
            >
              ${escapeHtml(message.content).replaceAll("\n", "<br>")}
              <time>${message.queued ? '<span class="queue-mark">待发送</span>' : ""}${formatTime(
                message.createdAt,
              )}</time>
            </div>
            ${
              message.role === "user"
                ? `<span class="message-avatar">${miniAvatarMarkup(avatar, avatarName)}</span>`
                : ""
            }
          </div>`;
        })
        .join("")
    : `<div class="empty-state"><span>○</span><p>输入消息后点击发送<br>气泡会先留在聊天中</p></div>`;

  attachMessageInteractions();
  renderQueueConfirm();
  requestAnimationFrame(() => {
    list.scrollTop = list.scrollHeight;
  });
}

function renderQueueConfirm() {
  const character = currentCharacter();
  const queued = character ? queuedMessages(character.id) : [];
  const panel = $("#queue-confirm");
  panel.hidden = queued.length === 0;
  $("#queue-count").textContent = `待交给 AI · ${queued.length} 个气泡 / 1 轮`;
  $("#confirm-send-ai").disabled = sending;
}

function stageCurrentMessage(event) {
  event.preventDefault();
  if (sending) return;
  const input = $("#message-input");
  const content = input.value.trim();
  const character = currentCharacter();
  if (!character) {
    showToast("请先选择一个角色");
    navigate("contacts");
    return;
  }
  if (!content) {
    showToast("先写下一条消息");
    return;
  }

  const queued = queuedMessages(character.id);
  const turnId = queued[0]?.turnId || createId("turn");
  (state.chats[character.id] ||= []).push({
    id: createId("msg"),
    turnId,
    role: "user",
    content,
    createdAt: Date.now(),
    source: "phone",
    queued: true,
  });

  input.value = "";
  autoGrowComposer();
  scheduleSave();
  renderAll();
  input.focus();
}

async function confirmQueuedMessages() {
  if (sending) return;
  const character = currentCharacter();
  if (!character) return;
  const queued = queuedMessages(character.id);
  if (!queued.length) {
    showToast("没有待发送的消息");
    return;
  }

  setSending(true);
  try {
    const replies = await requestCharacterReply(character, queued);
    queued.forEach((message) => {
      message.queued = false;
    });
    const assistantTurnId = createId("turn");
    const replyTime = Date.now();
    replies.forEach((content, index) => {
      state.chats[character.id].push({
        id: createId("msg"),
        turnId: assistantTurnId,
        role: "assistant",
        content,
        createdAt: replyTime + index,
        source: "ai",
        queued: false,
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
  $("#confirm-send-ai").disabled = value;
  $("#stage-message").disabled = value;
  $("#message-input").disabled = value;
}

async function requestCharacterReply(character, queued) {
  const settings = state.settings;
  if (!settings.apiUrl || !settings.model) throw new Error("API_NOT_CONFIGURED");

  const contextMessages = buildContextMessages(character.id, settings.contextTurns);
  const currentUserContent = queued.map((message, index) => `【气泡 ${index + 1}】${message.content}`).join("\n");
  const loreSearchText = [
    currentUserContent,
    ...contextMessages.slice(-6).map((message) => message.content),
  ].join("\n");
  const lore = collectLore(character.id, loreSearchText);
  const systemPrompt = buildSystemPrompt(character, lore);

  const response = await fetch(normalizeChatEndpoint(settings.apiUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...contextMessages,
        { role: "user", content: currentUserContent },
      ],
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

function buildContextMessages(characterId, limit) {
  const messages = (state.chats[characterId] || []).filter((message) => !message.queued);
  const groups = [];

  messages.forEach((message) => {
    const last = groups.at(-1);
    if (last && last.turnId === message.turnId && last.role === message.role) {
      last.contents.push(message.content);
    } else {
      groups.push({
        turnId: message.turnId || message.id,
        role: message.role === "assistant" ? "assistant" : "user",
        contents: [message.content],
      });
    }
  });

  const count = clampNumber(limit, 0, 200, 12);
  return groups.slice(count === 0 ? groups.length : -count).map((group) => ({
    role: group.role,
    content: group.contents.join("\n"),
  }));
}

function buildSystemPrompt(character, loreEntries) {
  const template = state.settings.systemPromptTemplate || DEFAULT_SYSTEM_PROMPT;
  const characterCard = [
    character.description && `描述：${character.description}`,
    character.personality && `性格：${character.personality}`,
    character.scenario && `场景：${character.scenario}`,
    character.mesExample && `对话示例：\n${character.mesExample}`,
    character.systemPrompt && `角色卡系统提示词：\n${character.systemPrompt}`,
    character.postHistoryInstructions && `历史后指令：\n${character.postHistoryInstructions}`,
  ]
    .filter(Boolean)
    .join("\n\n") || "未填写额外角色设定。";
  const loreText = loreEntries.length
    ? loreEntries.map((entry) => `- ${entry.comment ? `${entry.comment}：` : ""}${entry.content}`).join("\n")
    : "本轮没有命中世界书条目。";

  const replacements = {
    "{{char}}": character.name,
    "{{user}}": state.profile.name || "你",
    "{{player_persona}}": state.profile.persona || "玩家暂未填写人设。",
    "{{character_card}}": characterCard,
    "{{worldbook}}": loreText,
    "{{reply_rules}}": DEFAULT_REPLY_RULES,
  };

  return Object.entries(replacements).reduce(
    (text, [token, value]) => text.replaceAll(token, value),
    template,
  );
}

function collectLore(characterId, text) {
  const lower = String(text || "").toLowerCase();
  return state.worldBooks
    .filter((book) => book.enabled && (!book.characterId || book.characterId === characterId))
    .flatMap((book) => book.entries)
    .filter((entry) => {
      if (!entry.enabled) return false;
      if (entry.constant) return true;
      const primaryHit = entry.keys.some((key) => key && lower.includes(key.toLowerCase()));
      if (!primaryHit) return false;
      if (!entry.selective || !entry.secondaryKeys?.length) return true;
      return entry.secondaryKeys.some((key) => key && lower.includes(key.toLowerCase()));
    })
    .sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0))
    .slice(0, 30);
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
    .slice(0, 16);
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

function attachMessageInteractions() {
  $$("[data-message-id]", $("#message-list")).forEach((bubble) => {
    const open = () => openMessageEditor(bubble.dataset.messageId);
    bubble.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(open, 560);
    });
    ["pointerup", "pointercancel", "pointerleave", "pointermove"].forEach((type) => {
      bubble.addEventListener(type, () => clearTimeout(longPressTimer));
    });
    bubble.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      open();
    });
    bubble.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === "F2") {
        event.preventDefault();
        open();
      }
    });
  });
}

function openMessageEditor(messageId) {
  const character = currentCharacter();
  const message = character
    ? (state.chats[character.id] || []).find((item) => item.id === messageId)
    : null;
  if (!message) return;
  $("#message-edit-id").value = message.id;
  $("#message-edit-content").value = message.content;
  openModal("message-modal");
  setTimeout(() => $("#message-edit-content").focus(), 80);
}

function saveMessageEdit(event) {
  event.preventDefault();
  const message = findCurrentMessage($("#message-edit-id").value);
  const content = $("#message-edit-content").value.trim();
  if (!message || !content) return;
  message.content = content;
  message.updatedAt = Date.now();
  scheduleSave();
  closeModal("message-modal");
  renderAll();
  showToast("消息已修改");
}

function deleteEditedMessage() {
  const character = currentCharacter();
  const messageId = $("#message-edit-id").value;
  const message = findCurrentMessage(messageId);
  if (!character || !message || !window.confirm("删除这条消息？")) return;
  state.chats[character.id] = state.chats[character.id].filter((item) => item.id !== messageId);
  scheduleSave();
  closeModal("message-modal");
  renderAll();
  showToast("消息已删除");
}

function findCurrentMessage(messageId) {
  const character = currentCharacter();
  return character
    ? (state.chats[character.id] || []).find((item) => item.id === messageId)
    : null;
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
      avatar = await resizeImageFile(file);
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
      if (!character.avatar) character.avatar = old.avatar;
      state.characters.splice(existing, 1, character);
    } else {
      state.characters.push(character);
    }
    state.currentCharacterId = character.id;
    state.chats[character.id] ||= [];
    if (!state.chats[character.id].length && character.firstMes) {
      const turnId = createId("turn");
      splitSentences(character.firstMes).forEach((content, index) => {
        state.chats[character.id].push({
          id: createId("msg"),
          turnId,
          role: "assistant",
          content,
          createdAt: Date.now() + index,
          source: "card",
          queued: false,
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
    showToast(
      error.message === "PNG_CARD_NOT_FOUND"
        ? "这张 PNG 中没有找到酒馆角色卡数据"
        : "角色卡读取失败，请确认文件格式",
    );
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

function openCharacterEditor(characterId) {
  const character = state.characters.find((item) => item.id === characterId);
  if (!character) return;
  $("#character-edit-id").value = character.id;
  $("#character-name").value = character.name || "";
  $("#character-description").value = character.description || "";
  $("#character-personality").value = character.personality || "";
  $("#character-scenario").value = character.scenario || "";
  $("#character-first-mes").value = character.firstMes || "";
  $("#character-mes-example").value = character.mesExample || "";
  $("#character-system-prompt").value = character.systemPrompt || "";
  $("#character-post-history").value = character.postHistoryInstructions || "";
  pendingCharacterAvatar = character.avatar || "";
  renderCharacterAvatarDraft(character.name);
  openModal("character-modal");
}

function saveCharacterEdits(event) {
  event.preventDefault();
  const character = state.characters.find((item) => item.id === $("#character-edit-id").value);
  if (!character) return;
  character.name = $("#character-name").value.trim() || character.name;
  character.description = $("#character-description").value.trim();
  character.personality = $("#character-personality").value.trim();
  character.scenario = $("#character-scenario").value.trim();
  character.firstMes = $("#character-first-mes").value.trim();
  character.mesExample = $("#character-mes-example").value.trim();
  character.systemPrompt = $("#character-system-prompt").value.trim();
  character.postHistoryInstructions = $("#character-post-history").value.trim();
  character.avatar = pendingCharacterAvatar;
  character.updatedAt = Date.now();
  scheduleSave();
  closeModal("character-modal");
  renderAll();
  showToast("角色卡已保存");
}

async function updateCharacterAvatarDraft(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    pendingCharacterAvatar = await resizeImageFile(file);
    renderCharacterAvatarDraft($("#character-name").value);
  } catch {
    showToast("头像读取失败");
  }
}

function removeCharacterAvatarDraft() {
  pendingCharacterAvatar = "";
  renderCharacterAvatarDraft($("#character-name").value);
}

function renderCharacterAvatarDraft(name) {
  const host = $("#character-avatar-preview");
  host.innerHTML = pendingCharacterAvatar
    ? `<img src="${escapeAttr(pendingCharacterAvatar)}" alt="" />`
    : escapeHtml(initialOf(name || "C"));
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
      ((bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3]) >>>
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
  return JSON.parse(decodeBase64Utf8(encoded));
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
      id: String(entry.uid ?? entry.id ?? createId(`entry_${index}`)),
      keys: normalizeKeys(entry.key ?? entry.keys ?? entry.keywords),
      secondaryKeys: normalizeKeys(entry.keysecondary ?? entry.secondary_keys),
      content: String(entry.content ?? entry.text ?? "").trim(),
      constant: Boolean(entry.constant ?? entry.always_active ?? false),
      selective: Boolean(entry.selective ?? false),
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

function openWorldBookEditor(bookId) {
  const book = state.worldBooks.find((item) => item.id === bookId);
  if (!book) return;
  editingWorldBookDraft = structuredClone(book);
  $("#worldbook-edit-id").value = book.id;
  $("#worldbook-name").value = book.name;
  $("#worldbook-enabled").checked = book.enabled;
  renderWorldBookEntries();
  openModal("worldbook-modal");
}

function renderWorldBookEntries() {
  const host = $("#worldbook-entry-list");
  if (!editingWorldBookDraft) {
    host.innerHTML = "";
    return;
  }
  host.innerHTML = editingWorldBookDraft.entries
    .map(
      (entry, index) => `
      <article class="entry-editor" data-entry-id="${escapeAttr(entry.id)}">
        <div class="entry-editor-head">
          <strong>${escapeHtml(entry.comment || `条目 ${index + 1}`)}</strong>
          <div class="entry-switch">
            <label>
              <input data-entry-field="enabled" type="checkbox" ${entry.enabled ? "checked" : ""} />
            </label>
            <button class="entry-delete" data-delete-entry="${escapeAttr(entry.id)}" type="button" aria-label="删除条目">×</button>
          </div>
        </div>
        <div class="entry-grid">
          <label>
            <span>条目名称</span>
            <input data-entry-field="comment" type="text" value="${escapeAttr(entry.comment || "")}" />
          </label>
          <label>
            <span>优先级</span>
            <input data-entry-field="priority" type="number" value="${Number(entry.priority) || 0}" />
          </label>
        </div>
        <label>
          <span>关键词（逗号分隔）</span>
          <input data-entry-field="keys" type="text" value="${escapeAttr(entry.keys.join(", "))}" />
        </label>
        <label>
          <span>条目内容</span>
          <textarea data-entry-field="content">${escapeHtml(entry.content)}</textarea>
        </label>
        <div class="entry-options">
          <label><input data-entry-field="constant" type="checkbox" ${entry.constant ? "checked" : ""} /> 常驻条目</label>
          <span>${entry.enabled ? "当前启用" : "当前关闭"}</span>
        </div>
      </article>`,
    )
    .join("");
}

function updateWorldBookEntryDraft(event) {
  const field = event.target.dataset.entryField;
  const article = event.target.closest("[data-entry-id]");
  if (!field || !article || !editingWorldBookDraft) return;
  const entry = editingWorldBookDraft.entries.find((item) => item.id === article.dataset.entryId);
  if (!entry) return;

  if (field === "enabled" || field === "constant") {
    entry[field] = event.target.checked;
  } else if (field === "priority") {
    entry.priority = Number(event.target.value) || 0;
  } else if (field === "keys") {
    entry.keys = normalizeKeys(event.target.value);
  } else {
    entry[field] = event.target.value;
  }
}

function handleWorldBookEntryClick(event) {
  const button = event.target.closest("[data-delete-entry]");
  if (!button || !editingWorldBookDraft) return;
  editingWorldBookDraft.entries = editingWorldBookDraft.entries.filter(
    (entry) => entry.id !== button.dataset.deleteEntry,
  );
  renderWorldBookEntries();
}

function addWorldBookEntry() {
  if (!editingWorldBookDraft) return;
  editingWorldBookDraft.entries.push({
    id: createId("entry"),
    keys: [],
    secondaryKeys: [],
    content: "",
    constant: false,
    selective: false,
    enabled: true,
    priority: 0,
    comment: "新条目",
  });
  renderWorldBookEntries();
  const panel = $("#worldbook-modal .modal-panel");
  requestAnimationFrame(() => {
    panel.scrollTop = panel.scrollHeight;
  });
}

function saveWorldBookEdits(event) {
  event.preventDefault();
  if (!editingWorldBookDraft) return;
  const index = state.worldBooks.findIndex((book) => book.id === editingWorldBookDraft.id);
  if (index < 0) return;
  editingWorldBookDraft.name = $("#worldbook-name").value.trim() || editingWorldBookDraft.name;
  editingWorldBookDraft.enabled = $("#worldbook-enabled").checked;
  editingWorldBookDraft.entries = editingWorldBookDraft.entries.filter((entry) => entry.content.trim());
  editingWorldBookDraft.updatedAt = Date.now();
  state.worldBooks.splice(index, 1, editingWorldBookDraft);
  editingWorldBookDraft = null;
  scheduleSave();
  closeModal("worldbook-modal");
  renderAll();
  showToast("世界书和条目设置已保存");
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

function fillSettingsForm() {
  $("#api-url").value = state.settings.apiUrl || "";
  $("#api-key").value = state.settings.apiKey || "";
  $("#api-temperature").value = state.settings.temperature ?? 0.8;
  $("#api-max-tokens").value = state.settings.maxTokens ?? 500;
  $("#context-turns").value = state.settings.contextTurns ?? 12;
  $("#player-name").value = state.profile.name || "你";
  $("#player-persona").value = state.profile.persona || "";
  $("#system-prompt-template").value =
    state.settings.systemPromptTemplate || DEFAULT_SYSTEM_PROMPT;
  renderModelOptions(state.settings.modelOptions, state.settings.model);
  renderPlayerAvatar();
}

function saveSettings(event) {
  event.preventDefault();
  state.profile.name = $("#player-name").value.trim() || "你";
  state.profile.persona = $("#player-persona").value.trim();
  state.settings.apiUrl = $("#api-url").value.trim();
  state.settings.apiKey = $("#api-key").value.trim();
  state.settings.model = $("#api-model").value;
  state.settings.temperature = clampNumber($("#api-temperature").value, 0, 2, 0.8);
  state.settings.maxTokens = clampNumber($("#api-max-tokens").value, 64, 4096, 500);
  state.settings.contextTurns = clampNumber($("#context-turns").value, 0, 200, 12);
  state.settings.systemPromptTemplate =
    $("#system-prompt-template").value.trim() || DEFAULT_SYSTEM_PROMPT;
  scheduleSave();
  renderAll();
  showToast("设置已保存在本机");
}

async function fetchModels() {
  const button = $("#fetch-models");
  const dot = $("#connection-dot");
  const apiUrl = $("#api-url").value.trim();
  const apiKey = $("#api-key").value.trim();
  if (!apiUrl) {
    showToast("请先填写 API 地址");
    return;
  }

  button.disabled = true;
  button.textContent = "拉取中…";
  dot.className = "connection-dot";
  try {
    const response = await fetch(normalizeModelsEndpoint(apiUrl), {
      method: "GET",
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const payload = await response.json();
    const source = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.models)
        ? payload.models
        : Array.isArray(payload)
          ? payload
          : [];
    const models = [
      ...new Set(
        source
          .map((item) => (typeof item === "string" ? item : item?.id || item?.name))
          .filter(Boolean)
          .map(String),
      ),
    ].sort((a, b) => a.localeCompare(b));
    if (!models.length) throw new Error("NO_MODELS");
    const previous = $("#api-model").value || state.settings.model;
    state.settings.modelOptions = models;
    const selected = models.includes(previous) ? previous : models[0];
    renderModelOptions(models, selected);
    dot.classList.add("ok");
    showToast(`已拉取 ${models.length} 个模型`);
  } catch (error) {
    dot.classList.add("fail");
    showToast(
      error.message === "NO_MODELS"
        ? "接口没有返回可用模型"
        : humanizeApiError(error),
    );
  } finally {
    button.disabled = false;
    button.textContent = "拉取模型";
  }
}

function renderModelOptions(models, selected) {
  const select = $("#api-model");
  const options = Array.isArray(models) ? models : [];
  const all = selected && !options.includes(selected) ? [selected, ...options] : options;
  select.innerHTML = all.length
    ? all
        .map(
          (model) =>
            `<option value="${escapeAttr(model)}" ${model === selected ? "selected" : ""}>${escapeHtml(model)}</option>`,
        )
        .join("")
    : `<option value="">请先拉取模型</option>`;
}

function normalizeChatEndpoint(url) {
  const clean = String(url || "").trim().replace(/\/+$/, "");
  if (!clean) throw new Error("API_NOT_CONFIGURED");
  if (/\/chat\/completions$/i.test(clean)) return clean;
  if (/\/v1$/i.test(clean)) return `${clean}/chat/completions`;
  if (/\/v1\//i.test(clean)) return `${clean}/chat/completions`;
  return `${clean}/v1/chat/completions`;
}

function normalizeModelsEndpoint(url) {
  const clean = String(url || "").trim().replace(/\/+$/, "");
  if (!clean) throw new Error("API_NOT_CONFIGURED");
  if (/\/chat\/completions$/i.test(clean)) return clean.replace(/\/chat\/completions$/i, "/models");
  if (/\/v1$/i.test(clean)) return `${clean}/models`;
  if (/\/v1\/.+/i.test(clean)) return clean.replace(/\/v1\/.*$/i, "/v1/models");
  return `${clean}/v1/models`;
}

async function updatePlayerAvatar(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    state.profile.avatar = await resizeImageFile(file);
    scheduleSave();
    renderPlayerAvatar();
    renderChat();
    showToast("玩家头像已更新");
  } catch {
    showToast("头像读取失败");
  }
}

function renderPlayerAvatar() {
  const host = $("#player-avatar-preview");
  host.innerHTML = state.profile.avatar
    ? `<img src="${escapeAttr(state.profile.avatar)}" alt="" />`
    : escapeHtml(initialOf(state.profile.name || "你"));
}

function resetPromptTemplate() {
  if (!window.confirm("把系统提示词恢复为默认模板？")) return;
  $("#system-prompt-template").value = DEFAULT_SYSTEM_PROMPT;
  showToast("已恢复默认模板，点击保存后生效");
}

function previewFinalPrompt() {
  const character = currentCharacter();
  if (!character) {
    showToast("请先导入并选择一个角色");
    return;
  }
  const previousTemplate = state.settings.systemPromptTemplate;
  state.settings.systemPromptTemplate =
    $("#system-prompt-template").value.trim() || DEFAULT_SYSTEM_PROMPT;
  const searchText = (state.chats[character.id] || [])
    .slice(-20)
    .map((message) => message.content)
    .join("\n");
  $("#prompt-preview-area").value = buildSystemPrompt(
    character,
    collectLore(character.id, searchText),
  );
  state.settings.systemPromptTemplate = previousTemplate;
  openModal("prompt-modal");
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
    await writeState(state);
    fillSettingsForm();
    renderAll();
    showToast("备份恢复完成");
  } catch (error) {
    console.error(error);
    showToast("备份文件无法读取");
  }
}

function humanizeApiError(error) {
  const message = String(error?.message || error || "");
  if (message === "API_NOT_CONFIGURED") return "请先填写 API 地址并拉取模型";
  if (message === "EMPTY_REPLY") return "AI 返回了空内容，请重试";
  if (message.includes("401") || message.includes("403")) return "认证失败，请检查 API Key";
  if (message.includes("404")) return "接口地址不正确，或服务不支持此功能";
  if (message.includes("429")) return "请求过于频繁或额度不足";
  if (message.includes("500") || message.includes("502") || message.includes("503")) {
    return "AI 服务暂时不可用";
  }
  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    return "网络或跨域连接失败，请检查 API 地址";
  }
  return `请求失败：${message.slice(0, 80) || "未知错误"}`;
}

function openModal(id) {
  const layer = $(`#${id}`);
  if (!layer) return;
  layer.hidden = false;
  document.body.classList.add("modal-open");
}

function closeModal(id) {
  const layer = $(`#${id}`);
  if (!layer) return;
  layer.hidden = true;
  if (!$$(".modal-layer").some((item) => !item.hidden)) {
    document.body.classList.remove("modal-open");
  }
}

function currentCharacter() {
  return state.characters.find((item) => item.id === state.currentCharacterId) || null;
}

function recentCharacter() {
  return state.characters
    .slice()
    .sort((a, b) => lastActivity(b.id) - lastActivity(a.id))[0] || null;
}

function queuedMessages(characterId) {
  return (state.chats[characterId] || []).filter(
    (message) => message.role === "user" && message.queued,
  );
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

function miniAvatarMarkup(avatar, name) {
  return `<span class="mini-avatar">${
    avatar
      ? `<img src="${escapeAttr(avatar)}" alt="" />`
      : escapeHtml(initialOf(name))
  }</span>`;
}

function initialOf(name) {
  return Array.from(String(name || "L").trim())[0]?.toUpperCase() || "L";
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
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
  const now = new Date();
  const time = formatTime(now);
  $("#clock").textContent = time;
  $("#home-clock").textContent = time;
  $("#home-date").textContent = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);
}

function dateStamp() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
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

function resizeImageFile(file, maxSize = 512) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      image.src = reader.result;
    };
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
