export const DEFAULT_REPLY_RULES = `【回复格式要求】
1. 先理解玩家本轮连续发送的全部气泡，再统一回应。
2. 像真实手机聊天一样简短自然，优先回复 2～6 句。
3. 每个数组元素只能放一句话，不得在同一个元素里写两句话。
4. 不写姓名前缀；除非角色设定明确要求，否则不写长段旁白。
5. 只输出合法 JSON，不要 Markdown：
{"replies":["第一句","第二句","第三句"]}`;

export const DEFAULT_SYSTEM_PROMPT = `你正在扮演“{{char}}”，与玩家“{{user}}”进行手机即时聊天。

【玩家人设】
{{player_persona}}

【角色卡】
{{character_card}}

【相关世界书】
{{worldbook}}

【酒馆同步记忆】
{{synced_memory}}

{{reply_rules}}`;

export const HOME_ITEM_IDS = [
  "clock",
  "today",
  "messages",
  "contacts",
  "library",
  "persona",
  "recent",
  "account",
  "sync",
  "settings",
  "backup",
];

export const DEFAULT_HOME_PAGES = [
  ["clock", "today", "messages", "contacts", "library", "persona", "recent"],
  ["account", "sync", "settings", "backup"],
];

export const DEFAULT_STATE = {
  schemaVersion: 5,
  currentCharacterId: null,
  characters: [],
  worldBooks: [],
  chats: {},
  chatBranches: {},
  activeBranchIds: {},
  sync: {
    lastAckSeq: 0,
    characterBindings: {},
    tavernInbox: {},
    mismatches: {},
  },
  homeLayout: {
    pages: structuredClone(DEFAULT_HOME_PAGES),
  },
  profile: {
    name: "你",
    persona: "",
    avatar: "",
  },
  settings: {
    apiUrl: "https://api.openai.com/v1/chat/completions",
    apiKey: "",
    model: "",
    modelOptions: [],
    temperature: 0.8,
    maxTokens: 500,
    contextTurns: 12,
    systemPromptTemplate: DEFAULT_SYSTEM_PROMPT,
    replyRules: DEFAULT_REPLY_RULES,
  },
};
