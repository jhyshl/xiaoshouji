import { computed, reactive, ref, watch } from "vue";
import {
  DEFAULT_HOME_PAGES,
  DEFAULT_REPLY_RULES,
  DEFAULT_STATE,
  DEFAULT_SYSTEM_PROMPT,
  HOME_ITEM_IDS,
} from "../constants.js";
import { readState, writeState } from "../services/database.js";
import {
  clampNumber,
  createId,
  normalizeKeys,
  stableTextHash,
} from "../utils/text.js";

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
let persistenceReady = false;
let storageOwner = "";

function normalizeHomePages(savedPages) {
  const allowed = new Set(HOME_ITEM_IDS);
  const seen = new Set();
  const source = Array.isArray(savedPages) ? savedPages : DEFAULT_HOME_PAGES;
  const pages = source
    .slice(0, 6)
    .map((page) =>
      (Array.isArray(page) ? page : []).filter((itemId) => {
        if (!allowed.has(itemId) || seen.has(itemId)) return false;
        seen.add(itemId);
        return true;
      }),
    );

  while (pages.length < 2) pages.push([]);
  HOME_ITEM_IDS.forEach((itemId) => {
    if (seen.has(itemId)) return;
    const defaultPage = DEFAULT_HOME_PAGES.findIndex((page) => page.includes(itemId));
    pages[Math.max(0, defaultPage)].push(itemId);
  });
  return pages;
}

function normalizeMessages(messages) {
  return Array.isArray(messages)
    ? messages.map((message) => ({
        ...message,
        id: message.id || createId("msg"),
        turnId: message.turnId || `legacy_${message.id || createId("turn")}`,
        queued: Boolean(message.queued),
      }))
    : [];
}

function legacyBranchId(characterId) {
  return `branch_${characterId}_main`;
}

function normalizeBranches(saved, characters) {
  const branches =
    saved.chatBranches && typeof saved.chatBranches === "object"
      ? structuredClone(saved.chatBranches)
      : {};

  Object.entries(branches).forEach(([branchId, branch]) => {
    if (!branch || typeof branch !== "object" || !branch.characterId) {
      delete branches[branchId];
      return;
    }
    branches[branchId] = {
      id: branch.id || branchId,
      characterId: branch.characterId,
      title: branch.title || "主聊天",
      origin: branch.origin || "phone",
      tavernSaveId: branch.tavernSaveId || "",
      tavernCharacterKey: branch.tavernCharacterKey || "",
      cloudBranchId: branch.cloudBranchId || "",
      messages: normalizeMessages(branch.messages),
      deletedMessageIds: Array.isArray(branch.deletedMessageIds)
        ? [...new Set(branch.deletedMessageIds.map(String))].slice(-200)
        : [],
      phoneSummary: branch.phoneSummary || null,
      tavernSummary: branch.tavernSummary || null,
      tavernRecent: branch.tavernRecent || null,
      cloudRevision: Number(branch.cloudRevision) || 0,
      localDirtyAt: Number(branch.localDirtyAt) || 0,
      createdAt: Number(branch.createdAt) || Date.now(),
      updatedAt: Number(branch.updatedAt) || Date.now(),
    };
  });

  characters.forEach((character) => {
    const existing = Object.values(branches).some(
      (branch) => branch.characterId === character.id,
    );
    if (existing) return;
    const id = legacyBranchId(character.id);
    branches[id] = {
      id,
      characterId: character.id,
      title: "主聊天",
      origin: "phone",
      tavernSaveId: "",
      tavernCharacterKey: "",
      cloudBranchId: "main",
      messages: normalizeMessages(saved.chats?.[character.id]),
      deletedMessageIds: [],
      phoneSummary: null,
      tavernSummary: null,
      tavernRecent: null,
      cloudRevision: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });
  characters.forEach((character) => {
    const characterBranches = Object.values(branches)
      .filter((branch) => branch.characterId === character.id)
      .sort((left, right) => left.createdAt - right.createdAt);
    characterBranches.forEach((branch, index) => {
      if (branch.cloudBranchId) return;
      branch.cloudBranchId = branch.tavernSaveId
        ? `tavern_${stableTextHash(
            `${branch.tavernCharacterKey}|${branch.tavernSaveId}`,
          )}`
        : index === 0
          ? "main"
          : branch.id;
    });
  });
  return branches;
}

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
  const characters = Array.isArray(saved.characters)
    ? saved.characters.map((character) => ({
        ...character,
        syncKey: character.syncKey || "",
      }))
    : [];
  const chatBranches = normalizeBranches(saved, characters);
  const activeBranchIds = {
    ...(saved.activeBranchIds && typeof saved.activeBranchIds === "object"
      ? saved.activeBranchIds
      : {}),
  };
  characters.forEach((character) => {
    const selected = chatBranches[activeBranchIds[character.id]];
    if (selected?.characterId === character.id) return;
    activeBranchIds[character.id] =
      Object.values(chatBranches).find(
        (branch) => branch.characterId === character.id,
      )?.id || "";
  });
  const merged = {
    ...structuredClone(DEFAULT_STATE),
    ...saved,
    schemaVersion: 7,
    characters,
    worldBooks: Array.isArray(saved.worldBooks) ? saved.worldBooks : [],
    chats: {},
    chatBranches,
    activeBranchIds,
    sync: {
      ...DEFAULT_STATE.sync,
      ...(saved.sync || {}),
      characterBindings: {
        ...DEFAULT_STATE.sync.characterBindings,
        ...(saved.sync?.characterBindings || {}),
      },
      tavernInbox: {
        ...DEFAULT_STATE.sync.tavernInbox,
        ...(saved.sync?.tavernInbox || {}),
      },
      mismatches: {
        ...DEFAULT_STATE.sync.mismatches,
        ...(saved.sync?.mismatches || {}),
      },
      lastAckSeq: Math.max(0, Number(saved.sync?.lastAckSeq) || 0),
    },
    homeLayout: {
      pages: normalizeHomePages(saved.homeLayout?.pages),
    },
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
      systemPromptTemplate: (
        saved.settings?.systemPromptTemplate || DEFAULT_SYSTEM_PROMPT
      ).replace("【酒馆同步记忆】", "【小手机与酒馆记忆】"),
      replyRules: saved.settings?.replyRules || DEFAULT_REPLY_RULES,
    },
  };
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

export async function initializeStore(ownerId) {
  if (!ownerId) return;
  clearTimeout(saveTimer);
  persistenceReady = false;
  storageOwner = ownerId;
  const saved = await readState(ownerId);
  const merged = mergeState(saved);
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, merged);
  activeView.value = "home";
  closeAllModals();
  persistenceReady = true;
}

export function startPersistence() {
  if (persistenceStarted) return;
  persistenceStarted = true;
  watch(
    state,
    () => {
      if (!persistenceReady || !storageOwner) return;
      clearTimeout(saveTimer);
      const ownerAtSchedule = storageOwner;
      saveTimer = setTimeout(() => {
        if (ownerAtSchedule === storageOwner) {
          writeState(state, ownerAtSchedule);
        }
      }, 180);
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
  ensureDefaultBranch(characterId);
  navigate("chat");
}

export function branchesForCharacter(characterId) {
  return Object.values(state.chatBranches)
    .filter((branch) => branch.characterId === characterId)
    .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
}

export function activeBranchForCharacter(characterId) {
  const selected = state.chatBranches[state.activeBranchIds[characterId]];
  if (selected?.characterId === characterId) return selected;
  return ensureDefaultBranch(characterId);
}

export function messagesForCharacter(characterId) {
  return activeBranchForCharacter(characterId)?.messages || [];
}

export function ensureDefaultBranch(characterId, seedMessages = []) {
  if (!characterId) return null;
  const existing = branchesForCharacter(characterId)[0];
  if (existing) {
    state.activeBranchIds[characterId] ||= existing.id;
    return state.chatBranches[state.activeBranchIds[characterId]] || existing;
  }
  const branch = {
    id: createId("branch"),
    characterId,
    title: "主聊天",
    origin: "phone",
    tavernSaveId: "",
    tavernCharacterKey: "",
    cloudBranchId: "main",
    messages: normalizeMessages(seedMessages),
    deletedMessageIds: [],
    phoneSummary: null,
    tavernSummary: null,
    tavernRecent: null,
    cloudRevision: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  state.chatBranches[branch.id] = branch;
  state.activeBranchIds[characterId] = branch.id;
  return branch;
}

export function setActiveBranch(characterId, branchId) {
  const branch = state.chatBranches[branchId];
  if (!branch || branch.characterId !== characterId) return false;
  state.activeBranchIds[characterId] = branchId;
  branch.updatedAt = Date.now();
  return true;
}

export function queuedMessages(characterId) {
  return messagesForCharacter(characterId).filter(
    (message) => message.role === "user" && message.queued,
  );
}

export function lastActivity(characterId) {
  return messagesForCharacter(characterId).at(-1)?.createdAt || 0;
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
