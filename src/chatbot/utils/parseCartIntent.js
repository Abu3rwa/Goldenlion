const ARABIC_DIGIT_MAP = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

const NOISE_WORDS = new Set([
  "a",
  "an",
  "the",
  "my",
  "me",
  "please",
  "product",
  "products",
  "item",
  "items",
  "cart",
  "to",
  "in",
  "into",
  "from",
  "of",
  "and",
  "quantity",
  "qty",
  "all",
  "لو",
  "سمحت",
  "من",
  "فضلك",
  "المنتج",
  "المنتجات",
  "العنصر",
  "العناصر",
  "السلة",
  "سلتي",
  "الكمية",
  "كل",
  "في",
  "الى",
]);

const CONTEXT_TERMS = ["this", "this item", "that", "that item", "هذا", "هاذا", "هذي", "هذا المنتج"];

export const toAsciiDigits = (value = "") => {
  return `${value || ""}`.replace(/[٠-٩]/g, (digit) => ARABIC_DIGIT_MAP[digit] || digit);
};

export const normalizeSearchText = (value = "") => {
  return toAsciiDigits(`${value || ""}`.toLowerCase())
    .replace(/[^\p{L}\p{N}\s#-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const tokenizeSearchText = (value = "") => {
  return normalizeSearchText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token && !NOISE_WORDS.has(token));
};

const containsAny = (value = "", keywords = []) => {
  return keywords.some((keyword) => value.includes(keyword));
};

const ADD_KEYWORDS = ["add", "put", "place", "include", "ضيف", "اضف", "حط"];
const REMOVE_KEYWORDS = ["remove", "delete", "take", "cancel", "شيل", "احذف", "ازل"];
const UPDATE_KEYWORDS = ["set", "update", "change", "increase", "decrease", "خلي", "غير", "حدث", "زيد", "نقص"];
const CLEAR_KEYWORDS = ["clear", "empty", "افرغ", "فضي", "امسح"];
const TOTAL_KEYWORDS = [
  "cart total",
  "my cart total",
  "subtotal",
  "total amount",
  "how much is my cart",
  "how much is my cart total",
  "اجمالي السلة",
  "مجموع السلة",
  "كم اجمالي السلة",
  "كم مجموع السلة",
  "كم سعر السلة",
];
const SHOW_CART_KEYWORDS = [
  "show my cart",
  "show cart",
  "what is in my cart",
  "what's in my cart",
  "what is in cart",
  "what's in cart",
  "my cart",
  "what is in the cart",
  "اعرض السلة",
  "وريني السلة",
  "شنو في السلة",
  "شن في السلة",
  "شوف السلة",
  "السلة",
];

const cleanQuery = (value = "") => {
  const normalized = toAsciiDigits(`${value || ""}`)
    .replace(/[?!.,،؛]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized
    .replace(/\b(?:the|a|an|my|please|product|item|quantity|qty)\b/gi, " ")
    .replace(/\b(?:لو|سمحت|من|فضلك|المنتج|العنصر|الكمية)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const isContextReference = (value = "") => {
  const normalized = normalizeSearchText(value);
  return CONTEXT_TERMS.some((term) => normalized === normalizeSearchText(term));
};

const extractLeadingQuantity = (value = "") => {
  const match = cleanQuery(value).match(/^(\d+)\b/);
  if (!match) {
    return null;
  }

  const quantity = Number(match[1]);
  if (!Number.isInteger(quantity)) {
    return null;
  }

  const query = cleanQuery(value).replace(/^(\d+)\b/, "").trim();
  return {
    quantity,
    query,
  };
};

const extractTargetQuantity = (value = "") => {
  const normalized = cleanQuery(value);
  const explicitTarget = normalized.match(/\b(?:to|الى|=)\s*(\d+)\b/i);
  if (explicitTarget?.[1]) {
    return {
      mode: "set",
      quantity: Number(explicitTarget[1]),
      query: cleanQuery(normalized.replace(/\b(?:to|الى|=)\s*\d+\b/i, "")),
    };
  }

  const explicitDelta = normalized.match(/\b(?:by|بمقدار)\s*(\d+)\b/i);
  if (explicitDelta?.[1]) {
    return {
      mode: containsAny(normalizeSearchText(value), ["decrease", "نقص"]) ? "decrement" : "increment",
      quantity: Number(explicitDelta[1]),
      query: cleanQuery(normalized.replace(/\b(?:by|بمقدار)\s*\d+\b/i, "")),
    };
  }

  const quantityTokens = normalized.match(/\d+/g) || [];
  if (!quantityTokens.length) {
    return null;
  }

  return {
    mode: "set",
    quantity: Number(quantityTokens[quantityTokens.length - 1]),
    query: cleanQuery(normalized.replace(/\d+\s*$/, "")),
  };
};

const parseAddIntent = (message) => {
  const stripped = cleanQuery(
    `${message || ""}`
      .replace(/^(?:please\s+)?(?:add|put|place|include)\b/i, "")
      .replace(/^(?:ضيف|اضف|حط)\b/i, "")
      .replace(/\b(?:to|into|in)\s+(?:my\s+)?cart\b/gi, "")
      .replace(/\b(?:في|ل|بال)?\s*السلة\b/gi, "")
  );

  const quantityMatch = extractLeadingQuantity(stripped);
  const query = quantityMatch ? quantityMatch.query : stripped;

  return {
    matched: true,
    action: "add_item",
    quantity: quantityMatch?.quantity || 1,
    productQuery: isContextReference(query) ? "" : query,
    useContextProduct: !query || isContextReference(query),
  };
};

const parseRemoveIntent = (message, removeAll = false) => {
  const stripped = cleanQuery(
    `${message || ""}`
      .replace(/^(?:please\s+)?(?:remove|delete|take|cancel)\b/i, "")
      .replace(/^(?:شيل|احذف|ازل)\b/i, "")
      .replace(/\b(?:all)\b/gi, "")
      .replace(/\b(?:from)\s+(?:my\s+)?cart\b/gi, "")
      .replace(/\b(?:من|بال)?\s*السلة\b/gi, "")
  );

  return {
    matched: true,
    action: removeAll ? "remove_many" : "remove_item",
    quantity: null,
    productQuery: isContextReference(stripped) ? "" : stripped,
    useContextProduct: !stripped || isContextReference(stripped),
  };
};

const parseUpdateIntent = (message) => {
  const target = extractTargetQuantity(
    `${message || ""}`
      .replace(/^(?:please\s+)?(?:set|update|change|increase|decrease)\b/i, "")
      .replace(/^(?:خلي|غير|حدث|زيد|نقص)\b/i, "")
      .replace(/\b(?:quantity|qty|الكمية)\b/gi, "")
  );

  return {
    matched: true,
    action: "update_quantity",
    quantity: target?.quantity ?? null,
    quantityMode: target?.mode || "set",
    productQuery: isContextReference(target?.query || "") ? "" : (target?.query || ""),
    useContextProduct: !target?.query || isContextReference(target?.query || ""),
  };
};

export const parseCartIntent = (message = "") => {
  const normalized = normalizeSearchText(message);
  if (!normalized) {
    return { matched: false, action: "other" };
  }

  if (containsAny(normalized, TOTAL_KEYWORDS)) {
    return { matched: true, action: "show_total" };
  }

  if (containsAny(normalized, CLEAR_KEYWORDS) && containsAny(normalized, ["cart", "السلة", "سلتي"])) {
    return { matched: true, action: "clear_cart" };
  }

  if (
    containsAny(normalized, REMOVE_KEYWORDS) &&
    containsAny(normalized, ["all", "كل"]) &&
    containsAny(normalized, ["cart", "السلة", "سلتي"])
  ) {
    return parseRemoveIntent(message, true);
  }

  if (containsAny(normalized, UPDATE_KEYWORDS) && /\d/.test(normalized)) {
    return parseUpdateIntent(message);
  }

  if (containsAny(normalized, REMOVE_KEYWORDS)) {
    return parseRemoveIntent(message, false);
  }

  if (containsAny(normalized, ADD_KEYWORDS)) {
    return parseAddIntent(message);
  }

  if (containsAny(normalized, SHOW_CART_KEYWORDS) && containsAny(normalized, ["cart", "السلة", "سلتي"])) {
    return { matched: true, action: "show_cart" };
  }

  return { matched: false, action: "other" };
};
