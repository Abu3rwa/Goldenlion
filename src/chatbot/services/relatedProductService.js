import { hasColorVariants } from "../../utils/cartUtils";
import { normalizeSearchText } from "../utils/parseCartIntent";

const COMPLEMENTARY_RULES = [
  {
    sourceKeywords: ["phone", "iphone", "galaxy", "mobile", "هاتف", "ايفون", "جوال", "سامسونج"],
    targetKeywords: ["charger", "case", "cover", "screen protector", "power bank", "شاحن", "كفر", "غطاء", "حماية"],
  },
  {
    sourceKeywords: ["laptop", "macbook", "حاسوب", "لابتوب"],
    targetKeywords: ["mouse", "bag", "stand", "keyboard", "ماوس", "حقيبة", "ستاند", "كيبورد"],
  },
  {
    sourceKeywords: ["coffee", "espresso", "قهوة"],
    targetKeywords: ["mug", "cup", "filter", "sugar", "كوب", "فنجان", "فلتر"],
  },
  {
    sourceKeywords: ["shoe", "shoes", "nike", "adidas", "حذاء", "احذية", "أحذية", "نايك"],
    targetKeywords: ["sock", "socks", "bag", "care", "جوارب", "حقيبة"],
  },
];

const getProductText = (product = {}) => {
  return normalizeSearchText(
    [
      product.name,
      product.nameEn,
      product.nameAr,
      product.categoryName,
      product.category,
      ...(Array.isArray(product.tags) ? product.tags : []),
    ].filter(Boolean).join(" ")
  );
};

const scoreSuggestion = (candidate, baseProducts, targetKeywords) => {
  const text = getProductText(candidate);
  let score = 0;

  if (targetKeywords.length) {
    score += targetKeywords.reduce((total, keyword) => total + (text.includes(normalizeSearchText(keyword)) ? 20 : 0), 0);
  }

  const baseCategories = new Set(
    baseProducts
      .map((product) => normalizeSearchText(product.categoryName || product.category || ""))
      .filter(Boolean)
  );
  if (baseCategories.has(normalizeSearchText(candidate.categoryName || candidate.category || ""))) {
    score += 10;
  }

  if (candidate.featured) {
    score += 4;
  }

  return score;
};

export const suggestRelatedProducts = ({ baseProducts = [], catalogProducts = [], cartItems = [] } = {}) => {
  if (!baseProducts.length || !catalogProducts.length) {
    return [];
  }

  const cartProductIds = new Set((cartItems || []).map((item) => item.productId));
  const baseIds = new Set(baseProducts.map((product) => product.id));
  const sourceText = baseProducts.map((product) => getProductText(product)).join(" ");
  const targetKeywords = COMPLEMENTARY_RULES
    .filter((rule) => rule.sourceKeywords.some((keyword) => sourceText.includes(normalizeSearchText(keyword))))
    .flatMap((rule) => rule.targetKeywords);

  const scored = catalogProducts
    .filter((candidate) => candidate?.id && candidate.inStock)
    .filter((candidate) => !cartProductIds.has(candidate.id))
    .filter((candidate) => !baseIds.has(candidate.id))
    .filter((candidate) => !hasColorVariants(candidate))
    .map((candidate) => ({
      candidate,
      score: scoreSuggestion(candidate, baseProducts, targetKeywords),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      const nameCompare = `${left.candidate.name || ""}`.localeCompare(`${right.candidate.name || ""}`);
      return right.score - left.score || nameCompare;
    });

  if (scored.length) {
    return scored.slice(0, 3).map((entry) => entry.candidate);
  }

  return catalogProducts
    .filter((candidate) => candidate?.id && candidate.inStock)
    .filter((candidate) => !cartProductIds.has(candidate.id))
    .filter((candidate) => !baseIds.has(candidate.id))
    .filter((candidate) => !hasColorVariants(candidate))
    .slice(0, 3);
};
