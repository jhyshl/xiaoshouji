export function buildContextMessages(messages, limit) {
  const groups = [];
  messages
    .filter((message) => !message.queued)
    .forEach((message) => {
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
  const count = Math.min(200, Math.max(0, Number(limit) || 0));
  return groups.slice(count === 0 ? groups.length : -count).map((group) => ({
    role: group.role,
    content: group.contents.join("\n"),
  }));
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

export function buildSystemPrompt({ character, profile, settings, loreEntries }) {
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
    "{{reply_rules}}": settings.replyRules || "未填写回复规则。",
  };
  return Object.entries(replacements).reduce(
    (text, [token, value]) => text.replaceAll(token, value),
    settings.systemPromptTemplate,
  );
}
