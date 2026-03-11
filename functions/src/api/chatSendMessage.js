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

function formatBusinessInfoResponse(data, locale) {
  if (!data) {
    return locale === "en"
      ? "Sorry, I don't have that information right now. Please contact support directly."
      : "للأسف ما عندي المعلومة حالياً. تواصل مع الدعم مباشرة.";
  }
  const parts = [];
  const pushSection = (title, lines = []) => {
    const validLines = lines.filter((line) => `${line || ""}`.trim());
    if (!validLines.length) return;
    parts.push(title);
    validLines.forEach((line) => parts.push(`- ${line}`));
    parts.push("");
  };

  if (data.location) {
    pushSection("📍 الموقع:", [
      data.location.address ? `العنوان: ${data.location.address}` : "",
      data.location.city ? `المدينة: ${data.location.city}` : "",
      data.location.googleMapsUrl ? `الخريطة: ${data.location.googleMapsUrl}` : "",
    ]);
  }

  if (data.workingHours) {
    pushSection("🕐 ساعات العمل:", [
      data.workingHours.weekdays ? `أيام الأسبوع: ${data.workingHours.weekdays}` : "",
      data.workingHours.friday ? `الجمعة: ${data.workingHours.friday}` : "",
      data.workingHours.saturday ? `السبت: ${data.workingHours.saturday}` : "",
      data.workingHours.notes ? `ملاحظات: ${data.workingHours.notes}` : "",
    ]);
  }

  if (data.contact) {
    pushSection("📞 التواصل:", [
      data.contact.phone ? `الهاتف: ${data.contact.phone}` : "",
      data.contact.whatsapp ? `واتساب: ${data.contact.whatsapp}` : "",
      data.contact.email ? `البريد: ${data.contact.email}` : "",
      data.contact.instagram ? `انستقرام: ${data.contact.instagram}` : "",
      data.contact.facebook ? `فيسبوك: ${data.contact.facebook}` : "",
    ]);
  }

  if (data.delivery) {
    pushSection("🚚 التوصيل:", [data.delivery]);
  }

  if (data.payment) {
    pushSection("💳 طرق الدفع:", [data.payment]);
  }

  if (data.returnPolicy) {
    pushSection("🔄 سياسة الاسترجاع:", [data.returnPolicy]);
  }

  if (data.aboutUs) {
    pushSection("ℹ️ عن المتجر:", [data.aboutUs]);
  }

  if (data.faq) {
    pushSection(`❓ ${data.faq.question || "سؤال متكرر"}:`, [data.faq.answer]);
  }

  const text = parts.join("\n").trim();
  return text || (locale === "en"
    ? "Sorry, I don't have that information right now. Please contact support directly."
    : "للأسف ما عندي المعلومة حالياً. تواصل مع الدعم مباشرة.");
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
  if (/^[a-z0-9_-]{3,}$/i.test(normalized) && /\d/.test(normalized)) {
    return "order_status";
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
    normalized.includes("موقع") ||
    normalized.includes("عنوان") ||
    normalized.includes("وين") ||
    normalized.includes("فين") ||
    normalized.includes("مكان") ||
    normalized.includes("ساعات") ||
    normalized.includes("وقت العمل") ||
    normalized.includes("مواعيد") ||
    normalized.includes("مفتوح") ||
    normalized.includes("يغلق") ||
    normalized.includes("تواصل") ||
    normalized.includes("هاتف") ||
    normalized.includes("انستقرام") ||
    normalized.includes("فيسبوك") ||
    normalized.includes("واتس") ||
    normalized.includes("بريد") ||
    normalized.includes("ايميل") ||
    normalized.includes("دفع") ||
    normalized.includes("فيزا") ||
    normalized.includes("كاش") ||
    normalized.includes("نقد") ||
    normalized.includes("من نحن") ||
    normalized.includes("عن المتجر") ||
    normalized.includes("نبذة") ||
    normalized.includes("location") ||
    normalized.includes("hours") ||
    normalized.includes("address") ||
    normalized.includes("contact") ||
    normalized.includes("payment") ||
    normalized.includes("about")
  ) {
    return "business_info";
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

function mapOrderStatusToArabic(status) {
  const normalized = `${status || ""}`.trim().toLowerCase();
  const map = {
    pending: "قيد المراجعة",
    processing: "قيد التجهيز",
    confirmed: "تم التأكيد",
    shipped: "تم الشحن",
    in_transit: "في الطريق",
    out_for_delivery: "خرج للتسليم",
    delivered: "تم التسليم",
    cancelled: "ملغي",
    canceled: "ملغي",
    returned: "مرتجع",
    failed: "تعذر التنفيذ",
    unpaid: "غير مدفوع",
    paid: "مدفوع",
  };
  return map[normalized] || (status ? `${status}` : "قيد المعالجة");
}

function buildOrderStatusText(record, locale) {
  if (!record) {
    return "ما لقيت طلب بهذا الرقم. تأكد من الرقم وأعد المحاولة.";
  }

  const statusLabel = mapOrderStatusToArabic(record.status || "processing");
  const lines = [
    `حالة الطلب ${record.orderNumber}:`,
    `- الحالة الحالية: ${statusLabel}`,
  ];

  if (record.trackingNumber) {
    lines.push(`- رقم التتبع: ${record.trackingNumber}`);
  }

  if (record.carrier) {
    lines.push(`- شركة الشحن: ${record.carrier}`);
  }

  if (record.eta) {
    lines.push(`- موعد الوصول المتوقع: ${record.eta}`);
  }

  return lines.join("\n");
}

function buildOrderDetailsUrl(orderNumber) {
  if (!orderNumber) return null;
  return `/orders/${encodeURIComponent(`${orderNumber}`)}`;
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
          ? "Please send your order number to check its status (example: Track order GL-202603-123)."
          : "اكتب رقم الطلب للتتبع (مثال: تتبع الطلب GL-202603-123).",
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
      orderDetailsUrl: buildOrderDetailsUrl(record?.orderNumber),
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

  if (intent === "business_info") {
    const toolResults = await executeToolRequests(
      [{ name: "business_info", args: { topic: payload.message } }],
      {}
    );
    const data = toolResults?.[0]?.result?.data;
    if (data) {
      const text = formatBusinessInfoResponse(data, payload.locale);
      return {
        assistantText: text,
        quickReplies: buildQuickReplies(payload.locale),
        productCards: [],
        requiresVerification: false,
        citations: [],
        intent,
        toolCalls: toolResults.map((r) => ({ name: r.name, args: r.args })),
      };
    }
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
        orderDetailsUrl: localResponse.orderDetailsUrl || null,
        requiresVerification: localResponse.requiresVerification,
        verificationOrderNumber: localResponse.verificationOrderNumber || null,
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
  if (
    plan.intent === "business_info" &&
    !plannedToolRequests.some((r) => r?.name === "business_info")
  ) {
    plannedToolRequests.push({
      name: "business_info",
      args: { topic: payload.message },
    });
  }

  if (plannedToolRequests.length) {
    toolResults = await executeToolRequests(plannedToolRequests, {
      sessionId: payload.sessionId,
      userId: payload.userId || null,
    });
  }

  const orderStatusRecord = toolResults.find((entry) => entry.name === "order_status")?.result?.record || null;
  const extractedOrderNumber = extractOrderNumber(payload.message);
  const orderDetailsUrl = plan.intent === "order_status"
    ? buildOrderDetailsUrl(orderStatusRecord?.orderNumber || extractedOrderNumber)
    : null;
  const businessInfoData = toolResults.find((entry) => entry.name === "business_info")?.result?.data || null;
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
      : plan.intent === "business_info" && businessInfoData
        ? formatBusinessInfoResponse(businessInfoData, payload.locale)
        : (`${plan.answerDraft || ""}`.trim() || buildFallback(payload.locale).assistantText);
  const productCards = buildProductCards(toolResults, plan.language || payload.locale);
  const citations = buildCitations(toolResults);
  const response = {
    assistantText,
    quickReplies: buildQuickReplies(plan.language || payload.locale),
    productCards,
    orderDetailsUrl,
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
