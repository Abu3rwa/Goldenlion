const { CHAT_LIMITS, LOCALES } = require("../utils/constants");
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
      ? "حالياً صار خلل مؤقت. اختر من الخيارات السريعة تحت أو اكتب: تتبع الطلب / الشحن / الاسترجاع / اقتراح منتجات / التحدث مع الدعم."
      : "Temporary issue. Use quick replies below or type: Track order / Shipping / Returns / Recommend products / Talk to support.",
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

function detectLocalIntent(text = "") {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return "other";
  }
  if (
    normalized.includes("تتبع") ||
    normalized.includes("طلبي") ||
    normalized.includes("order") ||
    normalized.includes("track")
  ) {
    return "order_status";
  }
  if (
    normalized.includes("استرجاع") ||
    normalized.includes("ارجاع") ||
    normalized.includes("return") ||
    normalized.includes("refund")
  ) {
    return "returns";
  }
  if (
    normalized.includes("شحن") ||
    normalized.includes("توصيل") ||
    normalized.includes("shipping") ||
    normalized.includes("shipment") ||
    normalized.includes("delivery")
  ) {
    return "shipping";
  }
  if (
    normalized.includes("اقتراح") ||
    normalized.includes("منتج") ||
    normalized.includes("حقيبة") ||
    normalized.includes("حقائب") ||
    normalized.includes("شنطة") ||
    normalized.includes("شنط") ||
    normalized.includes("bag") ||
    normalized.includes("bags") ||
    normalized.includes("لابتوب") ||
    normalized.includes("ابغى") ||
    normalized.includes("نبي") ||
    normalized.includes("recommend") ||
    normalized.includes("suggest")
  ) {
    return "product_discovery";
  }
  if (
    normalized.includes("دعم") ||
    normalized.includes("واتساب") ||
    normalized.includes("support") ||
    normalized.includes("help")
  ) {
    return "support";
  }
  return "other";
}

function parseBudgetValue(text = "") {
  const normalized = `${text || ""}`.toLowerCase();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(?:ريال|sar|rs|lyd|دينار)?/i);
  if (!match) {
    return undefined;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function parseProductSearchArgs(text = "", locale = "ar") {
  const normalized = `${text || ""}`.trim();
  const lower = normalized.toLowerCase();

  const args = {
    query: normalized,
    limit: 6,
  };

  const maxHints = ["اقل من", "أقل من", "under", "less than", "max", "maximum", "حد أقصى"];
  const minHints = ["اكثر من", "أكثر من", "above", "more than", "min", "minimum", "حد أدنى"];
  const hasMaxHint = maxHints.some((h) => lower.includes(h));
  const hasMinHint = minHints.some((h) => lower.includes(h));
  const budget = parseBudgetValue(normalized);
  if (budget !== undefined) {
    if (hasMinHint && !hasMaxHint) {
      args.minPrice = budget;
    } else {
      args.maxPrice = budget;
    }
  }

  if (lower.includes("حقيبة") || lower.includes("حقائب") || lower.includes("شنطة") || lower.includes("شنط") || lower.includes("bag")) {
    args.category = locale === "en" ? "bags" : "حقائب";
    args.query = "";
  }

  // Generic recommendation requests should not over-constrain search by full sentence text.
  const genericDiscovery = [
    "اقتراح",
    "مقترح",
    "recommended",
    "recommend",
    "products",
    "منتجات",
    "اقترح",
  ].some((needle) => lower.includes(needle));
  if (genericDiscovery) {
    args.query = "";
  }

  return args;
}

function extractOrderNumber(text = "") {
  const raw = `${text || ""}`.trim();
  if (!raw) {
    return null;
  }

  const explicit = raw.match(/(?:رقم الطلب|طلب|order(?:\s*number)?)[\s:#-]*([a-z0-9_-]{3,})/i);
  if (explicit?.[1]) {
    return explicit[1].trim();
  }

  const tokenMatches = raw.match(/\b[a-z0-9_-]{3,}\b/gi) || [];
  const withDigit = tokenMatches.find((token) => /\d/.test(token));
  return withDigit ? withDigit.trim() : null;
}

function buildOrderStatusText(record, locale) {
  if (!record) {
    return locale === "en"
      ? "I could not find an order with this number. Please check and try again."
      : "ما لقيت طلب بهذا الرقم. تأكد من الرقم وأعد المحاولة.";
  }

  const status = record.status || "processing";
  if (locale === "en") {
    return `Order #${record.orderNumber}: ${status}${record.trackingNumber ? `, tracking: ${record.trackingNumber}` : ""}${record.carrier ? `, carrier: ${record.carrier}` : ""}${record.eta ? `, ETA: ${record.eta}` : ""}.`;
  }
  return `حالة الطلب ${record.orderNumber}: ${status}${record.trackingNumber ? `، رقم التتبع: ${record.trackingNumber}` : ""}${record.carrier ? `، شركة الشحن: ${record.carrier}` : ""}${record.eta ? `، موعد الوصول المتوقع: ${record.eta}` : ""}.`;
}

async function tryLocalIntentResponse(payload) {
  const intent = detectLocalIntent(payload.message);
  if (intent === "other") {
    return null;
  }

  if (intent === "order_status") {
    const orderNumber = extractOrderNumber(payload.message);
    if (!orderNumber) {
      return {
        assistantText: payload.locale === "en"
          ? "Please send your order number to check its status."
          : "اكتب رقم الطلب فقط وسأعرض لك حالته مباشرة.",
        quickReplies: buildQuickReplies(payload.locale),
        productCards: [],
        requiresVerification: false,
        citations: [],
        intent,
        toolCalls: [],
      };
    }

    const toolResults = await executeToolRequests(
      [{ name: "order_status", args: { orderNumber } }],
      {}
    );
    const record = toolResults?.[0]?.result?.record || null;
    return {
      assistantText: buildOrderStatusText(record, payload.locale),
      quickReplies: buildQuickReplies(payload.locale),
      productCards: [],
      requiresVerification: false,
      citations: [],
      intent,
      toolCalls: toolResults.map((r) => ({ name: r.name, args: r.args })),
    };
  }

  if (intent === "shipping" || intent === "returns") {
    const topic = intent === "shipping" ? "الشحن" : "الاسترجاع";
    const toolResults = await executeToolRequests(
      [{ name: "policy_lookup", args: { topic, locale: payload.locale } }],
      {}
    );
    const citations = buildCitations(toolResults);
    const first = toolResults?.[0]?.result?.records?.[0];
    return {
      assistantText: first?.content
        ? `${first.content}`.slice(0, 500)
        : intent === "shipping"
          ? "سياسة الشحن تعتمد على المدينة ووقت تجهيز الطلب. اكتب مدينتك لأعطيك التفاصيل."
          : "يمكنك طلب الاسترجاع خلال المدة المحددة حسب حالة المنتج. اكتب رقم الطلب للمساعدة.",
      quickReplies: buildQuickReplies(payload.locale),
      productCards: [],
      requiresVerification: false,
      citations,
      intent,
      toolCalls: toolResults.map((r) => ({ name: r.name, args: r.args })),
    };
  }

  if (intent === "product_discovery") {
    const searchArgs = parseProductSearchArgs(payload.message, payload.locale);
    let toolResults = await executeToolRequests(
      [{ name: "product_search", args: searchArgs }],
      {}
    );
    let cards = buildProductCards(toolResults, payload.locale);
    if (!cards.length) {
      toolResults = await executeToolRequests(
        [{ name: "product_search", args: { query: "", limit: 6 } }],
        {}
      );
      cards = buildProductCards(toolResults, payload.locale);
    }
    return {
      assistantText: cards.length
        ? "هذه منتجات متوفرة الآن:"
        : "ما لقيت نتائج دقيقة الآن، جرّب تحديد الفئة أو الميزانية.",
      quickReplies: buildQuickReplies(payload.locale),
      productCards: cards,
      requiresVerification: false,
      citations: [],
      intent,
      toolCalls: toolResults.map((r) => ({ name: r.name, args: r.args })),
    };
  }

  if (intent === "support") {
    return {
      assistantText: "تقدر تكتب مشكلتك هنا، أو تختار واتساب من زر التواصل السريع داخل المتجر.",
      quickReplies: buildQuickReplies(payload.locale),
      productCards: [],
      requiresVerification: false,
      citations: [],
      intent,
      toolCalls: [],
    };
  }

  return null;
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

  try {
    const localResponse = await tryLocalIntentResponse(payload);
    if (localResponse) {
      await saveMessage(payload.sessionId, "assistant", localResponse.assistantText, {
        intent: localResponse.intent,
        toolCalls: localResponse.toolCalls,
        citations: localResponse.citations,
      });
      return ok({
        assistantText: localResponse.assistantText,
        quickReplies: localResponse.quickReplies,
        productCards: localResponse.productCards,
        requiresVerification: localResponse.requiresVerification,
        citations: localResponse.citations,
      });
    }
  } catch (error) {
    console.error("chatSendMessage.local_intent_failed", {
      message: error?.message || `${error}`,
      code: error?.code || "local/failure",
      sessionId: payload.sessionId,
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
        verified: false,
        orderNumber: null,
      },
    });
  } catch (error) {
    console.error("chatSendMessage.plan_failed", {
      sessionId: payload.sessionId,
      message: error?.message || `${error}`,
      code: error?.code || "llm/failure",
      locale: payload.locale,
    });
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
    console.error("chatSendMessage.invalid_plan_shape", {
      sessionId: payload.sessionId,
      locale: payload.locale,
      planType: typeof plan,
      hasToolRequests: Array.isArray(plan?.toolRequests),
    });
    const fallback = buildFallback(payload.locale);
    await saveMessage(payload.sessionId, "assistant", fallback.assistantText, {
      intent: "fallback_invalid_json",
      toolCalls: [],
      citations: [],
    });
    return ok(fallback);
  }

  let toolResults = [];
  const plannedToolRequests = Array.isArray(plan.toolRequests) ? [...plan.toolRequests] : [];
  if (
    plan.intent === "order_status" &&
    !plannedToolRequests.some((request) => request?.name === "order_status")
  ) {
    const orderNumber = extractOrderNumber(payload.message);
    if (orderNumber) {
      plannedToolRequests.push({
        name: "order_status",
        args: { orderNumber },
      });
    }
  }
  if (!plannedToolRequests.length && plan.intent === "product_discovery") {
    plannedToolRequests.push({
      name: "product_search",
      args: parseProductSearchArgs(payload.message, payload.locale),
    });
  }

  if (plannedToolRequests.length) {
    toolResults = await executeToolRequests(plannedToolRequests, {
      sessionId: payload.sessionId,
      userId: payload.userId || null,
    });
  }

  const extractedOrderNumber = extractOrderNumber(payload.message);
  const orderStatusRecord = toolResults.find((entry) => entry.name === "order_status")?.result?.record || null;
  const assistantText = plan.intent === "order_status"
    ? (
      extractedOrderNumber
        ? buildOrderStatusText(orderStatusRecord, payload.locale)
        : (payload.locale === "en"
          ? "Please send your order number to check its status."
          : "اكتب رقم الطلب فقط وسأعرض لك حالته مباشرة.")
    )
    : plan.intent === "product_discovery"
      ? (
        buildProductCards(toolResults, plan.language || payload.locale).length
          ? "هذه منتجات متوفرة الآن:"
          : (payload.locale === "en"
            ? "No exact matches found. Share a category or budget and I will filter immediately."
            : "ما لقيت نتائج دقيقة الآن. اكتب الفئة أو الميزانية وسأفلتر لك مباشرة.")
      )
    : (`${plan.answerDraft || ""}`.trim() || buildFallback(payload.locale).assistantText);
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
