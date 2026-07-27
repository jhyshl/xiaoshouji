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
import {
  humanizeApiError,
  requestMemorySummary,
  requestReply,
} from "../services/ai.js";
import {
  buildConversationGroups,
  buildSyncedMemory,
  buildSystemPrompt,
  collectLore,
} from "../services/prompt.js";
import {
  queuePhoneChatSync,
  refreshBranchMemoryForAi,
  syncPhoneChatNow,
} from "../services/sync.js";
import { markMessagesDeliveredById } from "../utils/messages.js";
import { createId, stableTextHash } from "../utils/text.js";

function groupsHash(groups) {
  return stableTextHash(
    JSON.stringify(
      groups.map((group) => ({
        role: group.role,
        messageIds: group.messageIds,
        contents: group.contents,
        updatedAt: group.updatedAt,
      })),
    ),
  );
}

function groupsAsContext(groups) {
  return groups.map((group) => ({
    role: group.role,
    content: group.contents.join("\n"),
  }));
}

async function preparePhoneContext(branch, messages) {
  const groups = buildConversationGroups(messages);
  const maxRecent = Math.min(
    200,
    Math.max(0, Number(state.settings.contextTurns) || 0),
  );
  const savedSummary = branch.phoneSummary;
  let coveredCount = 0;
  let summaryIsValid = false;

  if (savedSummary?.content && !savedSummary.stale) {
    const coveredIndex = groups.findIndex((group) =>
      group.messageIds.includes(savedSummary.coveredThroughMessageId),
    );
    if (coveredIndex >= 0) {
      const coveredGroups = groups.slice(0, coveredIndex + 1);
      summaryIsValid = groupsHash(coveredGroups) === savedSummary.sourceHash;
      if (summaryIsValid) coveredCount = coveredIndex + 1;
    } else if (savedSummary.coveredThroughMessageId) {
      // A newly connected device intentionally receives only the cloud window.
      // Its older bubbles may be absent, while their authoritative summary remains usable.
      summaryIsValid = true;
    }
  }

  const unsummarized = groups.slice(coveredCount);
  const overflowCount = Math.max(0, unsummarized.length - maxRecent);
  if (!overflowCount) {
    if (savedSummary?.stale && groups.length <= maxRecent) branch.phoneSummary = null;
    return groupsAsContext(unsummarized.slice(maxRecent ? -maxRecent : 0));
  }

  const newSummaryGroups = unsummarized.slice(0, overflowCount);
  const coveredGroups = groups.slice(0, coveredCount + overflowCount);
  const summary = await requestMemorySummary({
    settings: state.settings,
    previousSummary: summaryIsValid ? savedSummary.content : "",
    conversationGroups: summaryIsValid ? newSummaryGroups : coveredGroups,
  });
  const lastCoveredGroup = coveredGroups.at(-1);
  branch.phoneSummary = {
    content: summary,
    sourceHash: groupsHash(coveredGroups),
    coveredThroughMessageId: lastCoveredGroup.messageIds.at(-1),
    coveredThroughAt: lastCoveredGroup.updatedAt,
    coveredGroups: coveredGroups.length,
    stale: false,
    updatedAt: Date.now(),
  };
  queuePhoneChatSync(branch.characterId, "memory.summary");
  return groupsAsContext(unsummarized.slice(overflowCount));
}

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
  const queuedIds = queued.map((message) => message.id);
  sending.value = true;
  try {
    let branch = activeBranchForCharacter(character.id);
    branch =
      (await refreshBranchMemoryForAi(character.id, branch?.id)) || branch;
    const contextMessages = await preparePhoneContext(
      branch,
      branch.messages,
    );
    await syncPhoneChatNow(
      character.id,
      "memory.before-ai",
      branch.id,
    ).catch(() => null);
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
      syncedMemory: buildSyncedMemory(branch),
    });
    const replies = await requestReply({
      settings: state.settings,
      systemPrompt,
      contextMessages,
      queued,
    });
    const replyTime = Date.now();
    markMessagesDeliveredById(branch.messages, queuedIds, replyTime);
    const assistantTurnId = createId("turn");
    replies.forEach((content, index) => {
      branch.messages.push({
        id: createId("msg"),
        turnId: assistantTurnId,
        role: "assistant",
        content,
        createdAt: replyTime + index,
        source: "ai",
        queued: false,
      });
    });
    queuePhoneChatSync(character.id, "message.reply", branch.id);
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
  const branch = activeBranchForCharacter(character.id);
  if (
    branch?.phoneSummary?.coveredThroughAt &&
    Number(message.createdAt) <= Number(branch.phoneSummary.coveredThroughAt)
  ) {
    branch.phoneSummary.stale = true;
  }
  modalState.messageId = null;
  queuePhoneChatSync(character.id, "message.edit");
  showToast("消息已修改");
}

export function deleteMessage(messageId) {
  const character = currentCharacter.value;
  if (!character || !window.confirm("删除这条消息？")) return;
  const messages = messagesForCharacter(character.id);
  const index = messages.findIndex((item) => item.id === messageId);
  const deleted = index >= 0 ? messages[index] : null;
  const branch = activeBranchForCharacter(character.id);
  if (deleted) {
    messages.splice(index, 1);
    branch.deletedMessageIds ||= [];
    branch.deletedMessageIds = [
      ...new Set([...branch.deletedMessageIds, messageId]),
    ].slice(-200);
    if (
      branch.phoneSummary?.coveredThroughAt &&
      Number(deleted.createdAt) <= Number(branch.phoneSummary.coveredThroughAt)
    ) {
      branch.phoneSummary.stale = true;
    }
  }
  modalState.messageId = null;
  queuePhoneChatSync(character.id, "message.delete");
  showToast("消息已删除");
}
