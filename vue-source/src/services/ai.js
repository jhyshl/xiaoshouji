import { parseReplies } from "../utils/text.js";

export function normalizeChatEndpoint(url) {
  const clean = String(url || "").trim().replace(/\/+$/, "");
  if (!clean) throw new Error("API_NOT_CONFIGURED");
  if (/\/chat\/completions$/i.test(clean)) return clean;
  if (/\/v1$/i.test(clean)) return `${clean}/chat/completions`;
  if (/\/v1\//i.test(clean)) return `${clean}/chat/completions`;
  return `${clean}/v1/chat/completions`;
}

export function normalizeModelsEndpoint(url) {
  const clean = String(url || "").trim().replace(/\/+$/, "");
  if (!clean) throw new Error("API_NOT_CONFIGURED");
  if (/\/chat\/completions$/i.test(clean)) {
    return clean.replace(/\/chat\/completions$/i, "/models");
  }
  if (/\/v1$/i.test(clean)) return `${clean}/models`;
  if (/\/v1\/.+/i.test(clean)) return clean.replace(/\/v1\/.*$/i, "/v1/models");
  return `${clean}/v1/models`;
}

export async function fetchModelList(apiUrl, apiKey) {
  const response = await fetch(normalizeModelsEndpoint(apiUrl), {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const payload = await response.json();
  const source = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.models)
      ? payload.models
      : Array.isArray(payload)
        ? payload
        : [];
  const models = [
    ...new Set(
      source
        .map((item) => (typeof item === "string" ? item : item?.id || item?.name))
        .filter(Boolean)
        .map(String),
    ),
  ].sort((a, b) => a.localeCompare(b));
  if (!models.length) throw new Error("NO_MODELS");
  return models;
}

export async function requestReply({ settings, systemPrompt, contextMessages, queued }) {
  if (!settings.apiUrl || !settings.model) throw new Error("API_NOT_CONFIGURED");
  const currentUserContent = queued
    .map((message, index) => `【气泡 ${index + 1}】${message.content}`)
    .join("\n");
  const response = await fetch(normalizeChatEndpoint(settings.apiUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...contextMessages,
        { role: "user", content: currentUserContent },
      ],
      temperature: Number(settings.temperature) || 0.8,
      max_tokens: Number(settings.maxTokens) || 500,
    }),
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const payload = await response.json();
  const content =
    payload?.choices?.[0]?.message?.content ??
    payload?.choices?.[0]?.text ??
    payload?.output_text ??
    "";
  const replies = parseReplies(content);
  if (!replies.length) throw new Error("EMPTY_REPLY");
  return replies;
}

export function humanizeApiError(error) {
  const message = String(error?.message || error || "");
  if (message === "API_NOT_CONFIGURED") return "请先填写 API 地址并拉取模型";
  if (message === "EMPTY_REPLY") return "AI 返回了空内容，请重试";
  if (message === "NO_MODELS") return "接口没有返回可用模型";
  if (message.includes("401") || message.includes("403")) return "认证失败，请检查 API Key";
  if (message.includes("404")) return "接口地址不正确，或服务不支持此功能";
  if (message.includes("429")) return "请求过于频繁或额度不足";
  if (/50[023]/.test(message)) return "AI 服务暂时不可用";
  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    return "网络或跨域连接失败，请检查 API 地址";
  }
  return `请求失败：${message.slice(0, 80) || "未知错误"}`;
}
