import {
  activeBranchForCharacter,
  branchesForCharacter,
  setActiveBranch,
  showToast,
  state,
} from "../store/linePhone.js";
import { queuePhoneChatSync } from "../services/sync.js";
import { createId } from "../utils/text.js";

function cloneMessages(messages) {
  return JSON.parse(JSON.stringify(Array.isArray(messages) ? messages : []));
}

function syncBranchSoon(characterId, kind) {
  queuePhoneChatSync(characterId, kind);
}

function inboxMemory(tavernCharacterKey) {
  const inbox = state.sync.tavernInbox[tavernCharacterKey] || {};
  return {
    tavernSummary: inbox.summary || null,
    tavernRecent: inbox.recent || null,
  };
}

export function createChatBranch({
  characterId,
  title = "新聊天",
  tavernSaveId = "",
  tavernCharacterKey = "",
  copyFromBranchId = "",
} = {}) {
  if (!state.characters.some((item) => item.id === characterId)) return null;
  const source = state.chatBranches[copyFromBranchId];
  const now = Date.now();
  const branch = {
    id: createId("branch"),
    characterId,
    title: String(title || "新聊天").trim().slice(0, 80) || "新聊天",
    origin: tavernSaveId ? "tavern" : "phone",
    tavernSaveId,
    tavernCharacterKey,
    messages:
      source?.characterId === characterId ? cloneMessages(source.messages) : [],
    ...inboxMemory(tavernCharacterKey),
    cloudRevision: 0,
    createdAt: now,
    updatedAt: now,
  };
  state.chatBranches[branch.id] = branch;
  state.activeBranchIds[characterId] = branch.id;
  syncBranchSoon(characterId, copyFromBranchId ? "branch.continue" : "branch.create");
  return branch;
}

export function switchChatBranch(characterId, branchId) {
  if (!setActiveBranch(characterId, branchId)) return false;
  delete state.sync.mismatches[characterId];
  syncBranchSoon(characterId, "branch.switch");
  showToast("已切换聊天分支");
  return true;
}

export function bindTavernCharacter(tavernCharacterKey, characterId) {
  if (!tavernCharacterKey || !state.characters.some((item) => item.id === characterId)) {
    return false;
  }
  state.sync.characterBindings[tavernCharacterKey] = characterId;
  const inbox = state.sync.tavernInbox[tavernCharacterKey] || {};
  const active = activeBranchForCharacter(characterId);
  const matching = branchesForCharacter(characterId).find(
    (branch) =>
      branch.tavernCharacterKey === tavernCharacterKey &&
      branch.tavernSaveId === inbox.active?.saveId,
  );
  if (inbox.active?.saveId && active?.id !== matching?.id) {
    state.sync.mismatches[characterId] = {
      tavernCharacterKey,
      tavernCharacterName: inbox.active.characterName || inbox.characterName || "",
      remoteSaveId: inbox.active.saveId,
      remoteSaveName: inbox.active.saveName || "酒馆存档",
      matchingBranchId: matching?.id || "",
      detectedAt: Date.now(),
    };
  }
  return true;
}

export function resolveSaveMismatch(characterId, mode) {
  const mismatch = state.sync.mismatches[characterId];
  if (!mismatch) return null;
  if (mode === "switch" && mismatch.matchingBranchId) {
    switchChatBranch(characterId, mismatch.matchingBranchId);
    return state.chatBranches[mismatch.matchingBranchId];
  }

  const current = activeBranchForCharacter(characterId);
  const continued = mode === "continue";
  const branch = createChatBranch({
    characterId,
    title: continued
      ? `${mismatch.remoteSaveName} · 沿用`
      : `${mismatch.remoteSaveName} · 空白`,
    tavernSaveId: mismatch.remoteSaveId,
    tavernCharacterKey: mismatch.tavernCharacterKey,
    copyFromBranchId: continued ? current?.id : "",
  });
  delete state.sync.mismatches[characterId];
  showToast(continued ? "已沿用旧聊天并建立新分支" : "已建立空白聊天分支");
  return branch;
}

export function renameChatBranch(branchId, title) {
  const branch = state.chatBranches[branchId];
  const clean = String(title || "").trim().slice(0, 80);
  if (!branch || !clean) return false;
  branch.title = clean;
  branch.updatedAt = Date.now();
  syncBranchSoon(branch.characterId, "branch.rename");
  return true;
}
