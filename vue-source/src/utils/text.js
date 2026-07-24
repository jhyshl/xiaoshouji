export function splitSentences(text) {
  const cleaned = String(text || "")
    .replace(/^[`"'“”‘’]+|[`"'“”‘’]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  const matches = cleaned.match(/[^。！？!?…]+(?:[。！？!?]+|…{1,2}|$)/g);
  return (matches || [cleaned]).map((item) => item.trim()).filter(Boolean);
}

function replyCandidates(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.replies)) return value.replies;
  if (Array.isArray(value?.messages)) return value.messages;
  if (typeof value?.reply === "string") return [value.reply];
  if (typeof value?.content === "string") return [value.content];
  return [];
}

function tryParseJson(raw) {
  const candidates = [raw];
  const objectStart = raw.indexOf("{");
  const objectEnd = raw.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(raw.slice(objectStart, objectEnd + 1));
  }
  const arrayStart = raw.indexOf("[");
  const arrayEnd = raw.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.push(raw.slice(arrayStart, arrayEnd + 1));
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const replies = replyCandidates(parsed);
      if (replies.length) return replies;
    } catch {
      // Continue with the next candidate and finally the tolerant scanner.
    }
  }
  return [];
}

function scanJsonStrings(source, startIndex) {
  const values = [];
  let index = startIndex;
  while (index < source.length) {
    const char = source[index];
    if (char === "]") break;
    if (char !== '"') {
      index += 1;
      continue;
    }
    const openingQuote = index;
    index += 1;
    let escaped = false;
    while (index < source.length) {
      const current = source[index];
      if (escaped) {
        escaped = false;
      } else if (current === "\\") {
        escaped = true;
      } else if (current === '"') {
        const token = source.slice(openingQuote, index + 1);
        try {
          values.push(JSON.parse(token));
        } catch {
          // Ignore only the malformed string instead of exposing JSON syntax.
        }
        index += 1;
        break;
      }
      index += 1;
    }
    if (index >= source.length && source.at(-1) !== '"') break;
  }
  return values;
}

function recoverReplyArray(raw) {
  const match = /["'](?:replies|messages)["']\s*:\s*\[/i.exec(raw);
  if (!match) return [];
  return scanJsonStrings(raw, match.index + match[0].length);
}

function cleanPlainReply(raw) {
  return raw
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/^\s*(?:回复|reply)\s*[:：]\s*/i, "")
    .trim();
}

export function parseReplies(rawContent) {
  const raw = typeof rawContent === "string" ? rawContent.trim() : "";
  if (!raw) return [];
  const withoutFence = cleanPlainReply(raw);
  let candidates = tryParseJson(withoutFence);
  if (!candidates.length) candidates = recoverReplyArray(withoutFence);
  if (!candidates.length) {
    // If the model attempted JSON but produced no recoverable string, fail closed.
    // Rendering the raw object is what caused JSON fragments to become chat bubbles.
    if (/["'](?:replies|messages|reply)["']\s*:/i.test(withoutFence)) return [];
    candidates = withoutFence
      .split(/\n+/)
      .map((line) => line.replace(/^\s*[-*•\d.)、]+\s*/, ""))
      .filter(Boolean);
  }
  return candidates
    .map((item) =>
      typeof item === "string" ? item : item?.content || item?.text || "",
    )
    .flatMap((item) => splitSentences(cleanPlainReply(item)))
    .map((item) => item.trim())
    .filter(
      (item) =>
        item &&
        !/^[\s{}[\],:"]+$/.test(item) &&
        !/^["']?(?:replies|messages|reply)["']?\s*:/i.test(item),
    )
    .slice(0, 16);
}

export function parseSummary(rawContent) {
  const raw = cleanPlainReply(
    typeof rawContent === "string" ? rawContent.trim() : "",
  );
  if (!raw) return "";
  for (const candidate of [
    raw,
    raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1),
  ]) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed?.summary === "string") return parsed.summary.trim();
      if (typeof parsed === "string") return parsed.trim();
    } catch {
      // A plain-text summary is valid as the final fallback.
    }
  }
  return raw
    .replace(/^\s*["']?summary["']?\s*[:：]\s*/i, "")
    .replace(/^[{"'\s]+|[}"'\s]+$/g, "")
    .trim();
}

export function stableTextHash(value) {
  const text = String(value || "");
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function normalizeKeys(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value || "")
    .split(/[,，\n|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function createId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export function initialOf(name) {
  return Array.from(String(name || "L").trim())[0]?.toUpperCase() || "L";
}

export function formatTime(timestamp) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp || Date.now()));
}

export function formatRelative(timestamp) {
  if (!timestamp) return "暂无消息";
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(
    new Date(timestamp),
  );
}
