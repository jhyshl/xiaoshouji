export function splitSentences(text) {
  const cleaned = String(text || "")
    .replace(/^["“”']+|["“”']+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];
  const matches = cleaned.match(/[^。！？!?…]+(?:[。！？!?]+|…{1,2}|$)/g);
  return (matches || [cleaned]).map((item) => item.trim()).filter(Boolean);
}

export function parseReplies(rawContent) {
  let raw = typeof rawContent === "string" ? rawContent.trim() : "";
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let candidates = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) candidates = parsed;
    else if (Array.isArray(parsed?.replies)) candidates = parsed.replies;
    else if (Array.isArray(parsed?.messages)) candidates = parsed.messages;
    else if (typeof parsed?.reply === "string") candidates = [parsed.reply];
  } catch {
    candidates = raw
      .split(/\n+/)
      .map((line) => line.replace(/^\s*[-*•\d.)、]+\s*/, ""))
      .filter(Boolean);
  }
  return candidates
    .flatMap((item) => splitSentences(item))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 16);
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
