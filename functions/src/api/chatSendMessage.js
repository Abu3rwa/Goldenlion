const { CHAT_LIMITS, LOCALES } = require("../utils/constants");
const { AppError } = require("../utils/appError");
const { ok } = require("../utils/response");
const { makeCallable } = require("../utils/callableHandler");
const { validateChatSendMessage } = require("../validators/chatValidators");
const { enforceRateLimit } = require("../services/rateLimitService");
const {
  touchSession,
  loadRecentMessages,
  saveMessage,
} = require("../services/chatSessionService");
const { planWithGemini } = require("../services/geminiService");
const { executeToolRequests } = require("../tools");
const { isSessionVerified } = require("../services/verificationService");

function extractIp(request) {
  const raw = request.rawRequest;
  if (!raw) {
    return "unknown";
  }
  return raw.headers["x-forwarded-for"]?.split(",")[0]?.trim() || raw.ip || "unknown";
}

function buildFallback(locale) {
  const ar = locale !== LOCALES.EN;
  return {
    assistantText: ar
      ? "أعتذر، لم أتمكن من معالجة الطلب حالياً. اكتب سؤالك بشكل مختصر وسأحاول مرة أخرى."
      : "Sorry, I could not process this request right now. Please retry with a short message.",
    quickReplies: ar
      ? ["تتبع الطلب", "الشحن", "الاسترجاع", "اقتراح منتجات", "التحدث مع الدعم"]
      : ["Track order", "Shipping", "Returns", "Recommend products", "Talk to support"],
    productCards: [],
    requiresVerification: false,
    citations: [],
  };
}

function buildProductCards(toolResults, locale) {
  const cards = [];
  for (const entry of toolResults) {
    const records = entry.result?.records;
    if (entry.name !== "product_search" || !Array.isArray(records)) {
      continue;
    }
    records.forEach((item) => {
      cards.push({
        id: item.id,
        image: item.imageUrl || "",
        name: locale === "en" ? item.nameEn : item.nameAr,
        price: item.price,
        currency: item.currency || "LYD",
      });
    });
  }
  return cards.slice(0, 6);
}

function buildCitations(toolResults) {
  const citations = [];
  for (const entry of toolResults) {
    if (entry.name === "policy_lookup") {
      const records = entry.result?.records || [];
      records.forEach((record) => {
        citations.push({
          id: record.id,
          label: record.title || "Policy",
        });
      });
    }
  }
  return citations;
}

function buildQuickReplies(locale) {
  if (locale === "en") {
    return ["Track order", "Shipping", "Returns", "Recommend products", "Talk to support"];
  }
  return ["تتبع الطلب", "الشحن", "الاسترجاع", "اقتراح منتجات", "التحدث مع الدعم"];
}

function isSecretProbe(text = "") {
  const lower = text.toLowerCase();
  return [
    "gemini_api_key",
    "api key",
    "secret",
    "admin token",
    "show prompt",
    "internal code",
    "مفتاح gemini",
    "اعطني المفتاح",
  ].some((needle) => lower.includes(needle));
}

/**
 * Callable: chatSendMessage
 */
const chatSendMessage = makeCallable(async (request) => {
  const payload = request.data || {};
  validateChatSendMessage(payload);

  const ip = extractIp(request);
  await enforceRateLimit(payload.sessionId, ip);
  await touchSession(payload.sessionId, payload);

  const history = await loadRecentMessages(payload.sessionId);
  const verifiedState = await isSessionVerified(payload.sessionId);

  await saveMessage(payload.sessionId, "user", payload.message.trim(), {
    locale: payload.locale,
    pageContext: payload.pageContext || {},
  });

  if (isSecretProbe(payload.message)) {
    const refusal = payload.locale === "en"
      ? "I cannot reveal secrets, keys, or internal system instructions."
      : "لا أستطيع كشف أي مفاتيح أو أسرار أو تعليمات داخلية للنظام.";
    await saveMessage(payload.sessionId, "assistant", refusal, {
      intent: "security_refusal",
      toolCalls: [],
      citations: [],
    });
    return ok({
      assistantText: refusal,
      quickReplies: buildQuickReplies(payload.locale),
      productCards: [],
      requiresVerification: false,
      citations: [],
    });
  }

  let plan;
  try {
    plan = await planWithGemini({
      locale: payload.locale,
      userId: payload.userId || null,
      message: payload.message.trim().slice(0, CHAT_LIMITS.MAX_MESSAGE_LENGTH),
      pageContext: payload.pageContext || {},
      history: history.map((m) => ({ role: m.role, text: m.text })).slice(-10),
      securityContext: {
        verified: verifiedState.verified,
        orderNumber: verifiedState.orderNumber,
      },
    });
  } catch (error) {
    const fallback = buildFallback(payload.locale);
    await saveMessage(payload.sessionId, "assistant", fallback.assistantText, {
      intent: "fallback",
      toolCalls: [],
      citations: [],
      errorCode: error.code || "llm/failure",
    });
    return ok(fallback);
  }

  if (!plan || typeof plan !== "object" || !Array.isArray(plan.toolRequests)) {
    const fallback = buildFallback(payload.locale);
    await saveMessage(payload.sessionId, "assistant", fallback.assistantText, {
      intent: "fallback_invalid_json",
      toolCalls: [],
      citations: [],
    });
    return ok(fallback);
  }

  const needsVerification = Boolean(plan.needsVerification) || (plan.intent === "order_status" && !verifiedState.verified);

  let toolResults = [];
  if (!needsVerification && Array.isArray(plan.toolRequests) && plan.toolRequests.length) {
    try {
      toolResults = await executeToolRequests(plan.toolRequests, {
        sessionId: payload.sessionId,
        userId: payload.userId || null,
        verificationToken: payload.verificationToken || "",
      });
    } catch (error) {
      if (error instanceof AppError && `${error.code}`.startsWith("verification/")) {
        const text = payload.locale === "en"
          ? "To view order details, please complete OTP verification."
          : "لعرض تفاصيل الطلب، يرجى إكمال التحقق عبر OTP.";
        await saveMessage(payload.sessionId, "assistant", text, {
          intent: plan.intent || "order_status",
          toolCalls: [],
          citations: [],
          requiresVerification: true,
        });
        return ok({
          assistantText: text,
          quickReplies: buildQuickReplies(payload.locale),
          productCards: [],
          requiresVerification: true,
          citations: [],
        });
      }
      throw error;
    }
  }

  if (needsVerification && plan.intent === "order_status") {
    const genericText = payload.locale === "en"
      ? "To view order details, please verify with OTP first."
      : "لعرض تفاصيل الطلب، لازم نتحقق أولاً برمز OTP.";
    await saveMessage(payload.sessionId, "assistant", genericText, {
      intent: plan.intent,
      toolCalls: [],
      citations: [],
      requiresVerification: true,
    });
    return ok({
      assistantText: genericText,
      quickReplies: buildQuickReplies(payload.locale),
      productCards: [],
      requiresVerification: true,
      citations: [],
    });
  }

  const assistantText = `${plan.answerDraft || ""}`.trim() || buildFallback(payload.locale).assistantText;
  const productCards = buildProductCards(toolResults, plan.language || payload.locale);
  const citations = buildCitations(toolResults);
  const response = {
    assistantText,
    quickReplies: buildQuickReplies(plan.language || payload.locale),
    productCards,
    requiresVerification: false,
    citations,
  };

  await saveMessage(payload.sessionId, "assistant", assistantText, {
    intent: plan.intent || "other",
    toolCalls: toolResults.map((r) => ({ name: r.name, args: r.args })),
    citations,
    language: plan.language,
  });

  return ok(response);
});

module.exports = {
  chatSendMessage,
};
