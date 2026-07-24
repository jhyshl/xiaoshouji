import {
  currentCharacter,
  mergeState,
  modalState,
  showToast,
  state,
} from "../store/linePhone.js";
import {
  DEFAULT_REPLY_RULES,
  DEFAULT_SYSTEM_PROMPT,
} from "../constants.js";
import { fetchModelList, humanizeApiError } from "../services/ai.js";
import { buildSystemPrompt, collectLore } from "../services/prompt.js";
import { writeState } from "../services/database.js";
import { dateStamp, downloadJson, resizeImageFile } from "../utils/files.js";

export async function fetchModels() {
  try {
    const models = await fetchModelList(state.settings.apiUrl, state.settings.apiKey);
    state.settings.modelOptions = models;
    if (!models.includes(state.settings.model)) state.settings.model = models[0];
    showToast(`已拉取 ${models.length} 个模型`);
  } catch (error) {
    showToast(humanizeApiError(error));
  }
}

export async function updatePlayerAvatar(file) {
  if (!file) return;
  try {
    state.profile.avatar = await resizeImageFile(file);
    showToast("玩家头像已更新");
  } catch {
    showToast("头像读取失败");
  }
}

export function resetSystemPrompt() {
  if (!window.confirm("把系统提示词恢复为默认模板？")) return;
  state.settings.systemPromptTemplate = DEFAULT_SYSTEM_PROMPT;
  showToast("系统提示词已恢复默认");
}

export function resetReplyRules() {
  if (!window.confirm("把回复规则恢复为默认内容？")) return;
  state.settings.replyRules = DEFAULT_REPLY_RULES;
  showToast("回复规则已恢复默认");
}

export function previewFinalPrompt() {
  const character = currentCharacter.value;
  if (!character) {
    showToast("请先导入并选择一个角色");
    return;
  }
  const searchText = (state.chats[character.id] || [])
    .slice(-20)
    .map((message) => message.content)
    .join("\n");
  modalState.promptPreview = buildSystemPrompt({
    character,
    profile: state.profile,
    settings: state.settings,
    loreEntries: collectLore(state.worldBooks, character.id, searchText),
  });
}

export function exportBackup() {
  const backup = JSON.parse(JSON.stringify(state));
  backup.settings.apiKey = "";
  backup.exportedAt = new Date().toISOString();
  backup.product = "LinePhone";
  downloadJson(`linephone-backup-${dateStamp()}.json`, backup);
  showToast("备份已导出，API Key 未包含");
}

export async function restoreBackup(file) {
  if (!file) return;
  try {
    const incoming = mergeState(JSON.parse(await file.text()));
    const currentKey = state.settings.apiKey;
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, incoming);
    if (!state.settings.apiKey) state.settings.apiKey = currentKey;
    await writeState(state);
    showToast("备份恢复完成");
  } catch (error) {
    console.error(error);
    showToast("备份文件无法读取");
  }
}
