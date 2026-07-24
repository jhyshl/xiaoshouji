import { computed, reactive, ref, watch } from "vue";
import {
  DEFAULT_REPLY_RULES,
  DEFAULT_STATE,
  DEFAULT_SYSTEM_PROMPT,
} from "../constants.js";
import { readState, writeState } from "../services/database.js";
import { clampNumber, createId, normalizeKeys } from "../utils/text.js";

export const state = reactive(structuredClone(DEFAULT_STATE));
export const activeView = ref("home");
export const sending = ref(false);
export const toastMessage = ref("");
export const modalState = reactive({
  characterId: null,
  worldBookId: null,
  messageId: null,
  promptPreview: "",
});

let saveTimer = null;
let toastTimer = null;
let persistenceStarted = false;

export const currentCharacter = computed(
  () => state.characters.find((item) => item.id === state.currentCharacterId) || null,
);

export const recentCharacter = computed(
  () =>
    state.characters
      .slice()
      .sort((a, b) => lastActivity(b.id) - lastActivity(a.id))[0] || null,
);

export function mergeState(saved) {
  if (!saved || typeof saved !== "object") return structuredClone(DEFAULT_STATE);
  const legacyPlayerName = saved.settings?.playerName;
  const merged = {
    ...structuredClone(DEFAULT_STATE),
    ...saved,
    schemaVersion: 3,
    characters: Array.isArray(saved.characters) ? saved.characters : [],
    worldBooks: Array.isArray(saved.worldBooks) ? saved.worldBooks : [],
    chats: saved.chats && typeof saved.chats === "object" ? saved.chats : {},
    profile: {
      ...DEFAULT_STATE.profile,
      ...(saved.profile || {}),
      name: saved.profile?.name || legacyPlayerName || "你",
    },
    settings: {
      ...DEFAULT_STATE.settings,
      ...(saved.settings || {}),
      contextTurns: clampNumber(saved.settings?.contextTurns, 0, 200, 12),
      modelOptions: Array.isArray(saved.settings?.modelOptions)
        ? saved.settings.modelOptions
        : [],
      systemPromptTemplate: saved.settings?.systemPromptTemplate || DEFAULT_SYSTEM_PROMPT,
      replyRules: saved.settings?.replyRules || DEFAULT_REPLY_RULES,
    },
  };
  Object.entries(merged.chats).forEach(([characterId, messages]) => {
    merged.chats[characterId] = Array.isArray(messages)
      ? messages.map((message) => ({
          ...message,
          id: message.id || createId("msg"),
          turnId: message.turnId || `legacy_${message.id || createId("turn")}`,
          queued: Boolean(message.queued),
        }))
      : [];
  });
  merged.worldBooks = merged.worldBooks.map((book) => ({
    ...book,
    enabled: book.enabled !== false,
    entries: Array.isArray(book.entries)
      ? book.entries.map((entry) => ({
          ...entry,
          enabled: entry.enabled !== false,
          constant: Boolean(entry.constant),
          selective: Boolean(entry.selective),
          priority: Number(entry.priority) || 0,
          keys: normalizeKeys(entry.keys),
          secondaryKeys: normalizeKeys(entry.secondaryKeys),
        }))
      : [],
  }));
  return merged;
}

export async function initializeStore() {
  const saved = await readState();
  const merged = mergeState(saved);
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, merged);
}

export function startPersistence() {
  if (persistenceStarted) return;
  persistenceStarted = true;
  watch(
    state,
    () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => writeState(state), 180);
    },
    { deep: true },
  );
}

export function navigate(view) {
  activeView.value = view;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function openChat(characterId) {
  if (!state.characters.some((item) => item.id === characterId)) return;
  state.currentCharacterId = characterId;
  state.chats[characterId] ||= [];
  navigate("chat");
}

export function queuedMessages(characterId) {
  return (state.chats[characterId] || []).filter(
    (message) => message.role === "user" && message.queued,
  );
}

export function lastActivity(characterId) {
  return state.chats[characterId]?.at(-1)?.createdAt || 0;
}

export function matchedWorldBookCount(characterId) {
  return state.worldBooks.filter(
    (book) => book.enabled && (!book.characterId || book.characterId === characterId),
  ).length;
}

export function showToast(message) {
  toastMessage.value = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage.value = "";
  }, 2400);
}

export function closeAllModals() {
  modalState.characterId = null;
  modalState.worldBookId = null;
  modalState.messageId = null;
  modalState.promptPreview = "";
}
