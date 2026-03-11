const TRACK_KEYWORDS = ["تتبع", "طلب", "order", "track"];
const SUPPORT_KEYWORDS = ["الدعم", "دعم", "support", "help"];

export const extractOrderNumberFromText = (value = "") => {
  const text = `${value || ""}`.trim();
  if (!text) {
    return null;
  }

  const explicitMatch = text.match(/(?:رقم الطلب|طلب|order(?:\s*number)?)[\s:#-]*([a-z0-9_-]{3,})/i);
  if (explicitMatch?.[1]) {
    return explicitMatch[1].trim();
  }

  const tokenMatches = text.match(/\b[a-z0-9_-]{3,}\b/gi) || [];
  const withDigit = tokenMatches.find((token) => /\d/.test(token));
  return withDigit ? withDigit.trim() : null;
};

export const isOrderTrackingIntent = (value = "") => {
  const text = `${value || ""}`.trim().toLowerCase();
  if (!text) return false;
  return TRACK_KEYWORDS.some((keyword) => text.includes(keyword));
};

export const shouldPromptForOrderNumber = (value = "") => {
  return isOrderTrackingIntent(value) && !extractOrderNumberFromText(value);
};

export const shouldOpenSupportTicket = (value = "") => {
  const text = `${value || ""}`.trim().toLowerCase();
  if (!text) return false;
  return SUPPORT_KEYWORDS.some((keyword) => text.includes(keyword));
};

export const buildOrderNumberPrompt = (locale = "ar") => {
  if (locale === "en") {
    return "To track your order, please send the order number first (example: Track order GL-202603-123).";
  }
  return "للتتبع بشكل فوري، اكتب رقم الطلب أولاً (مثال: تتبع الطلب GL-202603-123).";
};

export const buildVerificationInstruction = (locale = "ar", orderNumber = null) => {
  if (locale === "en") {
    return `To protect order privacy${orderNumber ? ` for ${orderNumber}` : ""}: 1) Enter the email linked to the order 2) We send a one-time code 3) Enter it to show full details.`;
  }
  return `لحماية خصوصية الطلب${orderNumber ? ` ${orderNumber}` : ""}: 1) أدخل البريد المرتبط بالطلب 2) نرسل رمز تحقق لمرة واحدة 3) أدخل الرمز لعرض التفاصيل الكاملة.`;
};

export const buildTicketSummary = ({ name, issue }) => {
  const safeName = `${name || ""}`.trim();
  const safeIssue = `${issue || ""}`.trim();
  return `الاسم: ${safeName}\nالمشكلة: ${safeIssue}`;
};

export const getChatApiErrorText = (error, fallbackText) => {
  const code = `${error?.details?.code || error?.code || ""}`.toLowerCase();
  if (code.includes("resource-exhausted")) {
    return "تم تجاوز الحد المؤقت للطلبات. حاول بعد دقيقة.";
  }
  if (code.includes("deadline-exceeded") || code.includes("unavailable")) {
    return "الخدمة بطيئة حالياً. حاول مرة ثانية بعد قليل.";
  }
  if (code.includes("permission-denied")) {
    return "غير مصرح بهذه العملية حالياً. حاول لاحقاً.";
  }
  return fallbackText;
};
