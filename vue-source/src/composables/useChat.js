import {
  currentCharacter,
  activeBranchForCharacter,
  messagesForCharacter,
  modalState,
  queuedMessages,
  sending,
  showToast,
  state,
} from "../store/linePhone.js";
import { humanizeApiError, requestReply } from "../services/ai.js";
import { buildContextMessages, buildSystemPrompt, collectLore } from "../services/prompt.js";
import { queuePhoneChatSync } from "../services/sync.js";
import { createId } from "../utils/text.js";

export function stageMessage(content) {
  const character = currentCharacter.value;
  const clean = String(content || "").trim();
  if (!character || !clean) return false;
  const queued = queuedMessages(character.id);
  const turnId = queued[0]?.turnId || createId("turn");
  messagesForCharacter(character.id).push({
    id: createId("msg"),
    turnId,
    role: "user",
    content: clean,
    createdAt: Date.now(),
    source: "phone",
    queued: true,
  });
  queuePhoneChatSync(character.id, "message.stage");
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
      messagesForCharacter(character.id),
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
      syncedMemory: [
        activeBranchForCharacter(character.id)?.tavernSummary?.stale &&
          "酒馆阶段总结因编辑、删除或重 roll 已标记为过期，不应作为事实采用；请以未总结的最近对话为准。",
        !activeBranchForCharacter(character.id)?.tavernSummary?.stale &&
          activeBranchForCharacter(character.id)?.tavernSummary?.content &&
          `阶段总结：\n${activeBranchForCharacter(character.id).tavernSummary.content}`,
        activeBranchForCharacter(character.id)?.tavernRecent?.rounds?.length &&
          `未总结的最近对话：\n${activeBranchForCharacter(character.id)
            .tavernRecent.rounds.map(
              (round) =>
                `第 ${round.floor} 楼\n玩家：${round.user || ""}\n角色：${round.assistant || ""}`,
            )
            .join("\n\n")}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
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
      messagesForCharacter(character.id).push({
        id: createId("msg"),
        turnId: assistantTurnId,
        role: "assistant",
        content,
        createdAt: replyTime + index,
        source: "ai",
        queued: false,
      });
    });
    queuePhoneChatSync(character.id, "message.reply");
  } catch (error) {
    showToast(humanizeApiError(error));
  } finally {
    sending.value = false;
  }
}

export function saveMessage(messageId, content) {
  const character = currentCharacter.value;
  const message = messagesForCharacter(character?.id).find(
    (item) => item.id === messageId,
  );
  const clean = String(content || "").trim();
  if (!message || !clean) return;
  message.content = clean;
  message.updatedAt = Date.now();
  modalState.messageId = null;
  queuePhoneChatSync(character.id, "message.edit");
  showToast("消息已修改");
}

export function deleteMessage(messageId) {
  const character = currentCharacter.value;
  if (!character || !window.confirm("删除这条消息？")) return;
  const messages = messagesForCharacter(character.id);
  const index = messages.findIndex((item) => item.id === messageId);
  if (index >= 0) messages.splice(index, 1);
  modalState.messageId = null;
  queuePhoneChatSync(character.id, "message.delete");
  showToast("消息已删除");
}
