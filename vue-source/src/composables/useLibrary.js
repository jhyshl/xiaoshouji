import {
  branchesForCharacter,
  currentCharacter,
  ensureDefaultBranch,
  modalState,
  navigate,
  openChat,
  showToast,
  state,
} from "../store/linePhone.js";
import {
  normalizeCharacter,
  normalizeWorldBook,
  parsePngCharacter,
} from "../services/importers.js";
import { resizeImageFile } from "../utils/files.js";
import { createId, splitSentences } from "../utils/text.js";

export async function importCharacterFile(file) {
  if (!file) return;
  try {
    let raw;
    let avatar = "";
    let sourceFormat = "json";
    if (file.type === "image/png" || file.name.toLowerCase().endsWith(".png")) {
      raw = parsePngCharacter(await file.arrayBuffer());
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
    const branch = ensureDefaultBranch(character.id);
    if (!branch.messages.length && character.firstMes) {
      const turnId = createId("turn");
      splitSentences(character.firstMes).forEach((content, index) => {
        branch.messages.push({
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
      book.embedded = true;
      const priorIndex = state.worldBooks.findIndex(
        (item) => item.characterId === character.id && item.embedded,
      );
      if (priorIndex >= 0) state.worldBooks.splice(priorIndex, 1, book);
      else state.worldBooks.push(book);
    }
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

export async function importWorldBookFile(file) {
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    const book = normalizeWorldBook(raw, file.name.replace(/\.json$/i, ""));
    state.worldBooks.push(book);
    showToast(`已导入世界书：${book.name}`);
  } catch (error) {
    console.error(error);
    showToast("世界书读取失败，请确认 JSON 格式");
  }
}

export function saveCharacter(draft) {
  const character = state.characters.find((item) => item.id === draft.id);
  if (!character) return;
  Object.assign(character, JSON.parse(JSON.stringify(draft)), {
    name: draft.name.trim() || character.name,
    updatedAt: Date.now(),
  });
  modalState.characterId = null;
  showToast("角色卡已保存");
}

export function deleteCharacter(characterId) {
  const character = state.characters.find((item) => item.id === characterId);
  if (!character || !window.confirm(`删除角色“${character.name}”及其本地聊天？`)) return;
  state.characters = state.characters.filter((item) => item.id !== characterId);
  state.worldBooks = state.worldBooks.filter((book) => book.characterId !== characterId);
  branchesForCharacter(characterId).forEach((branch) => {
    delete state.chatBranches[branch.id];
  });
  delete state.activeBranchIds[characterId];
  Object.entries(state.sync.characterBindings).forEach(([key, value]) => {
    if (value === characterId) delete state.sync.characterBindings[key];
  });
  delete state.sync.mismatches[characterId];
  if (state.currentCharacterId === characterId) {
    state.currentCharacterId = state.characters[0]?.id || null;
  }
  modalState.characterId = null;
  navigate("library");
  showToast("角色已删除");
}

export function saveWorldBook(draft) {
  const index = state.worldBooks.findIndex((item) => item.id === draft.id);
  if (index < 0) return;
  const clean = JSON.parse(JSON.stringify(draft));
  clean.name = clean.name.trim() || "未命名世界书";
  clean.entries = clean.entries.filter((entry) => entry.content.trim());
  clean.updatedAt = Date.now();
  state.worldBooks.splice(index, 1, clean);
  modalState.worldBookId = null;
  showToast("世界书已保存");
}

export function addWorldBookEntry(draft) {
  draft.entries.push({
    id: createId("entry"),
    keys: [],
    secondaryKeys: [],
    content: "",
    constant: false,
    selective: false,
    enabled: true,
    priority: 0,
    comment: "",
  });
}

export function deleteWorldBook(bookId) {
  const book = state.worldBooks.find((item) => item.id === bookId);
  if (!book || !window.confirm(`删除世界书“${book.name}”？`)) return;
  state.worldBooks = state.worldBooks.filter((item) => item.id !== bookId);
  modalState.worldBookId = null;
  showToast("世界书已删除");
}

export function openCurrentChat() {
  if (currentCharacter.value) openChat(currentCharacter.value.id);
  else {
    showToast("请先导入角色卡");
    navigate("library");
  }
}
