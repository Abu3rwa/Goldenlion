import { formatCents } from "../../utils/decimalUtils";

const DEFAULT_CURRENCY = "د.ل";

const createResponse = ({
  assistantText,
  quickReplies = [],
  productCards = [],
  pendingAction = null,
} = {}) => ({
  handled: true,
  assistantText,
  quickReplies,
  productCards,
  citations: [],
  pendingAction,
});

const getItemLabel = (item = {}) => {
  const baseName = item.productName || item.name || item.displayName || "المنتج";
  if (item?.selectedColor?.color && !`${baseName}`.includes(item.selectedColor.color)) {
    return `${baseName} - ${item.selectedColor.color}`;
  }
  return baseName;
};

const buildProductCards = (products = [], currency = DEFAULT_CURRENCY) => {
  return products.slice(0, 3).map((product) => ({
    id: product.id,
    name: product.name || product.nameEn || product.nameAr || "منتج",
    image: product.images?.[0] || product.imageUrl || "",
    price: Number(product.price || 0),
    currency,
  }));
};

const buildSummaryLines = (summary, currency) => ([
  "الملخص:",
  `- عدد القطع: ${summary.itemCount}`,
  `- عدد المنتجات: ${summary.uniqueItemCount}`,
  `- المجموع الفرعي: ${formatCents(summary.subtotal, currency)}`,
  `- الإجمالي الحالي: ${formatCents(summary.totalAmount, currency)}`,
]);

export const buildEmptyCartResponse = () => {
  return createResponse({
    assistantText: "السلة فارغة حالياً. إذا تحب نقدر نضيف لك منتج مباشرة من هنا.",
    quickReplies: ["اعرض منتجات", "كم إجمالي السلة؟"],
  });
};

export const buildMissingProductResponse = (action = "add") => {
  const text = action === "update"
    ? "اكتب اسم المنتج الذي تريد تعديل كميته مع الرقم المطلوب."
    : action === "remove"
      ? "اكتب اسم المنتج الذي تريد حذفه من السلة."
      : "اكتب اسم المنتج الذي تريد إضافته إلى السلة.";

  return createResponse({
    assistantText: text,
    quickReplies: ["اعرض السلة", "كم إجمالي السلة؟"],
  });
};

export const buildShowCartResponse = ({ items = [], summary, currency = DEFAULT_CURRENCY, suggestions = [] } = {}) => {
  const itemLines = items.slice(0, 6).map((item) => {
    return `- ${getItemLabel(item)} x ${item.quantity}: ${formatCents(Number(item.price || 0) * Number(item.quantity || 0), currency)}`;
  });
  if (items.length > 6) {
    itemLines.push(`- منتجات إضافية في السلة: ${items.length - 6}`);
  }

  const lines = [
    "السلة الحالية:",
    ...itemLines,
    ...buildSummaryLines(summary, currency),
  ];

  if (suggestions.length) {
    lines.push("قد تحتاج أيضاً هذه المنتجات:");
  }

  return createResponse({
    assistantText: lines.join("\n"),
    quickReplies: ["كم إجمالي السلة؟", "افرغ السلة"],
    productCards: buildProductCards(suggestions, currency),
  });
};

export const buildShowTotalResponse = ({ summary, currency = DEFAULT_CURRENCY } = {}) => {
  return createResponse({
    assistantText: buildSummaryLines(summary, currency).join("\n"),
    quickReplies: ["اعرض السلة", "افرغ السلة"],
  });
};

export const buildAddSuccessResponse = ({
  item,
  summary,
  currency = DEFAULT_CURRENCY,
  addedQuantity = 1,
  suggestions = [],
} = {}) => {
  const lines = [
    `تمت إضافة ${addedQuantity} من ${getItemLabel(item)} إلى السلة.`,
    `الكمية الحالية لهذا المنتج: ${item.quantity}.`,
    ...buildSummaryLines(summary, currency),
  ];

  if (suggestions.length) {
    lines.push("ممكن يعجبك أيضاً:");
  }

  return createResponse({
    assistantText: lines.join("\n"),
    quickReplies: ["اعرض السلة", "كم إجمالي السلة؟"],
    productCards: buildProductCards(suggestions, currency),
  });
};

export const buildRemoveSuccessResponse = ({ item, summary, currency = DEFAULT_CURRENCY } = {}) => {
  return createResponse({
    assistantText: [
      `تم حذف ${getItemLabel(item)} من السلة.`,
      ...buildSummaryLines(summary, currency),
    ].join("\n"),
    quickReplies: summary.itemCount ? ["اعرض السلة", "كم إجمالي السلة؟"] : ["اعرض منتجات", "اعرض السلة"],
  });
};

export const buildBulkRemoveSuccessResponse = ({ items = [], summary, currency = DEFAULT_CURRENCY } = {}) => {
  return createResponse({
    assistantText: [
      `تم حذف ${items.length} منتج من السلة.`,
      ...buildSummaryLines(summary, currency),
    ].join("\n"),
    quickReplies: summary.itemCount ? ["اعرض السلة", "كم إجمالي السلة؟"] : ["اعرض منتجات", "اعرض السلة"],
  });
};

export const buildUpdateQuantitySuccessResponse = ({ item, summary, currency = DEFAULT_CURRENCY } = {}) => {
  return createResponse({
    assistantText: [
      `تم تحديث كمية ${getItemLabel(item)} إلى ${item.quantity}.`,
      ...buildSummaryLines(summary, currency),
    ].join("\n"),
    quickReplies: ["اعرض السلة", "كم إجمالي السلة؟"],
  });
};

export const buildQuantityRemovedResponse = ({ item, summary, currency = DEFAULT_CURRENCY } = {}) => {
  return createResponse({
    assistantText: [
      `تم حذف ${getItemLabel(item)} من السلة لأن الكمية صارت صفر.`,
      ...buildSummaryLines(summary, currency),
    ].join("\n"),
    quickReplies: summary.itemCount ? ["اعرض السلة", "كم إجمالي السلة؟"] : ["اعرض منتجات", "اعرض السلة"],
  });
};

export const buildClearCartConfirmationResponse = (itemCount) => {
  return createResponse({
    assistantText: [
      "تأكيد مسح السلة:",
      `- سيتم حذف كل المنتجات الحالية وعددها ${itemCount}.`,
      'اكتب "نعم" للتأكيد أو "إلغاء" للتراجع.',
    ].join("\n"),
    quickReplies: ["نعم", "إلغاء"],
  });
};

export const buildClearCartSuccessResponse = () => {
  return createResponse({
    assistantText: "تم مسح السلة بالكامل.",
    quickReplies: ["اعرض منتجات", "اعرض السلة"],
  });
};

export const buildItemNotFoundResponse = (query = "") => {
  return createResponse({
    assistantText: query
      ? `ما لقيتش منتج مطابق لـ "${query}".`
      : "ما قدرتش أحدد المنتج المطلوب.",
    quickReplies: ["اعرض السلة", "اعرض منتجات"],
  });
};

export const buildItemNotInCartResponse = (query = "") => {
  return createResponse({
    assistantText: query
      ? `المنتج "${query}" غير موجود حالياً في السلة.`
      : "هذا المنتج غير موجود حالياً في السلة.",
    quickReplies: ["اعرض السلة", "اعرض منتجات"],
  });
};

export const buildAmbiguousProductResponse = ({ query = "", matches = [] } = {}) => {
  const options = matches.map((match) => `- ${match.displayName || match.name || match.productName || "منتج"}`);
  return createResponse({
    assistantText: [
      query
        ? `لقيت أكثر من منتج يطابق "${query}".`
        : "لقيت أكثر من منتج مطابق.",
      ...options,
      "اكتب الاسم الكامل أو اختر أحد الردود السريعة.",
    ].join("\n"),
    quickReplies: matches.map((match) => match.displayName || match.name || match.productName).filter(Boolean).slice(0, 3),
  });
};

export const buildPendingSelectionRetryResponse = ({ matches = [] } = {}) => {
  return createResponse({
    assistantText: "ما قدرتش أحدد اختيارك. اكتب الاسم الكامل أو رقم الخيار، أو اكتب إلغاء.",
    quickReplies: matches.map((match) => match.displayName || match.name || match.productName).filter(Boolean).slice(0, 3).concat("إلغاء"),
  });
};

export const buildOutOfStockResponse = (product = {}) => {
  const label = product.displayName || product.name || product.productName || "هذا المنتج";
  return createResponse({
    assistantText: `${label} غير متوفر حالياً في المخزون.`,
    quickReplies: ["اعرض السلة", "اعرض منتجات"],
  });
};

export const buildInsufficientStockResponse = ({ product = {}, remainingStock = 0, requestedQuantity = 0 } = {}) => {
  const label = product.displayName || product.name || product.productName || "هذا المنتج";
  return createResponse({
    assistantText: `ما نقدرش نضيف أو نحدث ${label} إلى ${requestedQuantity}. المتوفر حالياً: ${remainingStock}.`,
    quickReplies: ["اعرض السلة", "اعرض منتجات"],
  });
};

export const buildInvalidQuantityResponse = () => {
  return createResponse({
    assistantText: "الكمية المطلوبة غير صحيحة. استخدم رقم صحيح أكبر من صفر.",
    quickReplies: ["اعرض السلة", "كم إجمالي السلة؟"],
  });
};

export const buildVariantSelectionRequiredResponse = (product = {}) => {
  const label = product.displayName || product.name || "هذا المنتج";
  return createResponse({
    assistantText: `${label} يحتاج اختيار لون أو نوع قبل إضافته. افتح صفحة المنتج وحدد الخيار المناسب أولاً.`,
    quickReplies: ["اعرض منتجات", "اعرض السلة"],
  });
};

export const buildCancelledPendingActionResponse = () => {
  return createResponse({
    assistantText: "تم إلغاء العملية الحالية.",
    quickReplies: ["اعرض السلة", "كم إجمالي السلة؟"],
  });
};

export const buildTemporaryFailureResponse = () => {
  return createResponse({
    assistantText: "صار خلل مؤقت أثناء تنفيذ طلب السلة. حاول مرة ثانية بعد قليل.",
    quickReplies: ["اعرض السلة", "اعرض منتجات"],
  });
};
