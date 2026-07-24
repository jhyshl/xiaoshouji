export function buildConversationGroups(messages) {
  const groups = [];
  messages
    .filter((message) => !message.queued)
    .forEach((message) => {
      const last = groups.at(-1);
      if (last && last.turnId === message.turnId && last.role === message.role) {
        last.contents.push(message.content);
        last.messageIds.push(message.id);
        last.updatedAt = Math.max(
          last.updatedAt,
          Number(message.updatedAt) || Number(message.createdAt) || 0,
        );
      } else {
        groups.push({
          turnId: message.turnId || message.id,
          role: message.role === "assistant" ? "assistant" : "user",
          contents: [message.content],
          messageIds: [message.id],
          updatedAt: Number(message.updatedAt) || Number(message.createdAt) || 0,
        });
      }
    });
  return groups;
}

export function buildContextPlan(messages, limit) {
  const groups = buildConversationGroups(messages);
  const count = Math.min(200, Math.max(0, Number(limit) || 0));
  const recentGroups = count ? groups.slice(-count) : [];
  const summaryGroups = groups.slice(0, groups.length - recentGroups.length);
  return {
    groups,
    recentGroups,
    summaryGroups,
    contextMessages: recentGroups.map((group) => ({
      role: group.role,
      content: group.contents.join("\n"),
    })),
  };
}

export function buildContextMessages(messages, limit) {
  return buildContextPlan(messages, limit).contextMessages;
}

function formatTavernRounds(rounds) {
  return rounds
    .map(
      (round) =>
        `第 ${round.floor} 楼\n玩家：${round.user || ""}\n角色：${round.assistant || ""}`,
    )
    .join("\n\n");
}

export function buildSyncedMemory(branch) {
  if (!branch) return "";
  return [
    branch.phoneSummary?.stale &&
      "【小手机总结状态】\n小手机长期记忆因历史消息被编辑或删除而过期；本轮会先重新整理，再用于回复。",
    !branch.phoneSummary?.stale &&
      branch.phoneSummary?.content &&
      `【小手机已总结记忆】\n${branch.phoneSummary.content}`,
    branch.tavernSummary?.stale &&
      "【酒馆总结状态】\n酒馆阶段总结因编辑、删除或重 roll 已过期，不应作为事实采用；请以酒馆最新未总结内容为准。",
    !branch.tavernSummary?.stale &&
      branch.tavernSummary?.content &&
      `【酒馆已总结记忆】\n${branch.tavernSummary.content}`,
    branch.tavernRecent?.rounds?.length &&
      `【酒馆最新未总结内容】\n${formatTavernRounds(branch.tavernRecent.rounds)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function collectLore(worldBooks, characterId, text) {
  const lower = String(text || "").toLowerCase();
  return worldBooks
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

export function buildSystemPrompt({
  character,
  profile,
  settings,
  loreEntries,
  syncedMemory = "",
}) {
  const characterCard =
    [
      character.description && `描述：${character.description}`,
      character.personality && `性格：${character.personality}`,
      character.scenario && `场景：${character.scenario}`,
      character.mesExample && `对话示例：\n${character.mesExample}`,
      character.systemPrompt && `角色卡系统提示词：\n${character.systemPrompt}`,
      character.postHistoryInstructions &&
        `历史后指令：\n${character.postHistoryInstructions}`,
    ]
      .filter(Boolean)
      .join("\n\n") || "未填写额外角色设定。";
  const loreText = loreEntries.length
    ? loreEntries
        .map((entry) => `- ${entry.comment ? `${entry.comment}：` : ""}${entry.content}`)
        .join("\n")
    : "本轮没有命中世界书条目。";
  const replacements = {
    "{{char}}": character.name,
    "{{user}}": profile.name || "你",
    "{{player_persona}}": profile.persona || "玩家暂未填写人设。",
    "{{character_card}}": characterCard,
    "{{worldbook}}": loreText,
    "{{synced_memory}}":
      syncedMemory || "当前聊天分支没有小手机总结或酒馆同步记忆。",
    "{{reply_rules}}": settings.replyRules || "未填写回复规则。",
  };
  return Object.entries(replacements).reduce(
    (text, [token, value]) => text.replaceAll(token, value),
    settings.systemPromptTemplate,
  );
}
