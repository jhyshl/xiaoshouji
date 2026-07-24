import {
  currentCharacter,
  modalState,
  queuedMessages,
  sending,
  showToast,
  state,
} from "../store/linePhone.js";
import { humanizeApiError, requestReply } from "../services/ai.js";
import { buildContextMessages, buildSystemPrompt, collectLore } from "../services/prompt.js";
import { createId } from "../utils/text.js";

export function stageMessage(content) {
  const character = currentCharacter.value;
  const clean = String(content || "").trim();
  if (!character || !clean) return false;
  const queued = queuedMessages(character.id);
  const turnId = queued[0]?.turnId || createId("turn");
  (state.chats[character.id] ||= []).push({
    id: createId("msg"),
    turnId,
    role: "user",
    content: clean,
    createdAt: Date.now(),
    source: "phone",
    queued: true,
  });
  return true;
}

export async function confirmQueuedMessages() {
  if (sending.value) return;
  const character = currentCharacter.value;
  if (!character) return;
  const queued = queuedMessages(character.id);
  if (!queued.length) {
    showToast("没有待发送的消息");
    return;
  }
  sending.value = true;
  try {
    const contextMessages = buildContextMessages(
      state.chats[character.id] || [],
      state.settings.contextTurns,
    );
    const loreSearchText = [
      ...queued.map((message) => message.content),
      ...contextMessages.slice(-6).map((message) => message.content),
    ].join("\n");
    const lore = collectLore(state.worldBooks, character.id, loreSearchText);
    const systemPrompt = buildSystemPrompt({
      character,
      profile: state.profile,
      settings: state.settings,
      loreEntries: lore,
    });
    const replies = await requestReply({
      settings: state.settings,
      systemPrompt,
      contextMessages,
      queued,
    });
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
  } catch (error) {
    showToast(humanizeApiError(error));
  } finally {
    sending.value = false;
  }
}

export function saveMessage(messageId, content) {
  const character = currentCharacter.value;
  const message = (state.chats[character?.id] || []).find((item) => item.id === messageId);
  const clean = String(content || "").trim();
  if (!message || !clean) return;
  message.content = clean;
  message.updatedAt = Date.now();
  modalState.messageId = null;
  showToast("消息已修改");
}

export function deleteMessage(messageId) {
  const character = currentCharacter.value;
  if (!character || !window.confirm("删除这条消息？")) return;
  state.chats[character.id] = (state.chats[character.id] || []).filter(
    (item) => item.id !== messageId,
  );
  modalState.messageId = null;
  showToast("消息已删除");
}
