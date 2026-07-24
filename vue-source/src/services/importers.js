import { createId, normalizeKeys } from "../utils/text.js";

function decodeBase64Utf8(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function parsePngCharacter(buffer) {
  const bytes = new Uint8Array(buffer);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((value, index) => bytes[index] === value)) {
    throw new Error("INVALID_PNG");
  }
  const decoder = new TextDecoder("latin1");
  let offset = 8;
  const textValues = new Map();

  while (offset + 12 <= bytes.length) {
    const length =
      ((bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3]) >>>
      0;
    const type = decoder.decode(bytes.slice(offset + 4, offset + 8));
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > bytes.length) break;
    const chunk = bytes.slice(start, end);

    if (type === "tEXt") {
      const zero = chunk.indexOf(0);
      if (zero > 0) {
        textValues.set(
          decoder.decode(chunk.slice(0, zero)),
          decoder.decode(chunk.slice(zero + 1)),
        );
      }
    } else if (type === "iTXt") {
      const zero = chunk.indexOf(0);
      if (zero > 0) {
        const key = decoder.decode(chunk.slice(0, zero));
        let cursor = zero + 1;
        const compressionFlag = chunk[cursor++];
        cursor += 1;
        for (let field = 0; field < 2; field += 1) {
          while (cursor < chunk.length && chunk[cursor] !== 0) cursor += 1;
          cursor += 1;
        }
        if (compressionFlag === 0) {
          textValues.set(key, new TextDecoder().decode(chunk.slice(cursor)));
        }
      }
    }
    offset = end + 4;
    if (type === "IEND") break;
  }

  const encoded = textValues.get("chara") || textValues.get("ccv3") || textValues.get("character");
  if (!encoded) throw new Error("PNG_CARD_NOT_FOUND");
  return JSON.parse(decodeBase64Utf8(encoded));
}

export function normalizeCharacter(raw, meta = {}) {
  const data = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  if (!data || typeof data !== "object" || !String(data.name || "").trim()) {
    throw new Error("INVALID_CHARACTER");
  }
  return {
    id: createId("char"),
    name: String(data.name).trim(),
    description: String(data.description || data.char_persona || "").trim(),
    personality: String(data.personality || data.persona || "").trim(),
    scenario: String(data.scenario || data.world_scenario || "").trim(),
    firstMes: String(data.first_mes || data.first_message || data.greeting || "").trim(),
    mesExample: String(data.mes_example || data.example_dialogue || "").trim(),
    systemPrompt: String(data.system_prompt || "").trim(),
    postHistoryInstructions: String(data.post_history_instructions || "").trim(),
    creatorNotes: String(data.creator_notes || raw?.creator_notes || "").trim(),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    avatar: meta.avatar || "",
    sourceFormat: meta.sourceFormat || "json",
    sourceFile: meta.fileName || "",
    importedAt: Date.now(),
  };
}

export function normalizeWorldBook(raw, fallbackName = "未命名世界书", characterId = null) {
  const sourceEntries = raw?.entries ?? raw?.data?.entries ?? raw;
  const list = Array.isArray(sourceEntries)
    ? sourceEntries
    : sourceEntries && typeof sourceEntries === "object"
      ? Object.values(sourceEntries)
      : [];
  const entries = list
    .map((entry, index) => ({
      id: String(entry.uid ?? entry.id ?? createId(`entry_${index}`)),
      keys: normalizeKeys(entry.key ?? entry.keys ?? entry.keywords),
      secondaryKeys: normalizeKeys(entry.keysecondary ?? entry.secondary_keys),
      content: String(entry.content ?? entry.text ?? "").trim(),
      constant: Boolean(entry.constant ?? entry.always_active ?? false),
      selective: Boolean(entry.selective ?? false),
      enabled: !(entry.disable ?? entry.disabled ?? false),
      priority: Number(entry.order ?? entry.priority ?? entry.insertion_order ?? 0),
      comment: String(entry.comment ?? entry.name ?? "").trim(),
    }))
    .filter((entry) => entry.content);

  if (!entries.length) throw new Error("INVALID_WORLDBOOK");
  return {
    id: createId("book"),
    name: String(raw?.name || raw?.title || fallbackName),
    entries,
    enabled: true,
    characterId,
    importedAt: Date.now(),
  };
}
