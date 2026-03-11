import { publicProductService } from "../../services/publicProductService";
import { normalizeSearchText, tokenizeSearchText } from "../utils/parseCartIntent";

const CACHE_TTL_MS = 30 * 1000;

let catalogCache = {
  items: null,
  expiresAt: 0,
  promise: null,
};

const uniqueById = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
};

const getProductDisplayName = (product = {}) => {
  return product.name || product.nameEn || product.nameAr || "منتج بدون اسم";
};

const getProductSearchParts = (product = {}) => {
  return [
    product.id,
    product.name,
    product.nameEn,
    product.nameAr,
    product.description,
    product.descriptionEn,
    product.descriptionAr,
    product.categoryName,
    product.category,
    product.sku,
    product.barcode,
    product.code,
    ...(Array.isArray(product.tags) ? product.tags : []),
  ].filter(Boolean);
};

const getSearchText = (product = {}) => normalizeSearchText(getProductSearchParts(product).join(" "));

const scoreProductMatch = (product, query) => {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = tokenizeSearchText(query);
  const nameValues = [
    normalizeSearchText(product.name),
    normalizeSearchText(product.nameEn),
    normalizeSearchText(product.nameAr),
  ].filter(Boolean);
  const identifierValues = [
    normalizeSearchText(product.id),
    normalizeSearchText(product.sku),
    normalizeSearchText(product.barcode),
    normalizeSearchText(product.code),
  ].filter(Boolean);
  const haystack = getSearchText(product);

  if (!normalizedQuery) {
    return 0;
  }

  if (identifierValues.includes(normalizedQuery)) {
    return 120;
  }

  if (nameValues.includes(normalizedQuery)) {
    return 110;
  }

  if (nameValues.some((value) => value.startsWith(normalizedQuery))) {
    return 92;
  }

  if (haystack.includes(normalizedQuery)) {
    return 72;
  }

  if (!queryTokens.length) {
    return 0;
  }

  const matchedTokens = queryTokens.filter((token) => haystack.includes(token));
  if (matchedTokens.length === queryTokens.length && matchedTokens.length > 0) {
    return 75 + matchedTokens.length;
  }

  if (matchedTokens.length >= 2) {
    return 54 + matchedTokens.length;
  }

  return 0;
};

const resolveScoredMatches = (matches = []) => {
  const ranked = matches
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      const nameCompare = getProductDisplayName(left.product).localeCompare(getProductDisplayName(right.product));
      return right.score - left.score || nameCompare;
    });

  if (!ranked.length) {
    return { status: "not_found", matches: [] };
  }

  const [top, second] = ranked;
  if (top.score >= 100 && (!second || second.score < 100)) {
    return { status: "resolved", product: top.product, matches: ranked.slice(0, 3).map((entry) => entry.product) };
  }

  if (top.score >= 86 && (!second || top.score - second.score >= 12)) {
    return { status: "resolved", product: top.product, matches: ranked.slice(0, 3).map((entry) => entry.product) };
  }

  return {
    status: "ambiguous",
    matches: ranked.slice(0, 3).map((entry) => entry.product),
  };
};

const normalizeCandidate = (product = {}) => ({
  ...product,
  displayName: getProductDisplayName(product),
});

export const loadProductCatalog = async ({ catalogProducts = [], productService = publicProductService, forceRefresh = false } = {}) => {
  if (Array.isArray(catalogProducts) && catalogProducts.length) {
    return uniqueById(catalogProducts);
  }

  const now = Date.now();
  if (!forceRefresh && catalogCache.items && catalogCache.expiresAt > now) {
    return catalogCache.items;
  }

  if (!forceRefresh && catalogCache.promise) {
    return catalogCache.promise;
  }

  catalogCache.promise = Promise.resolve(productService.getAllProducts())
    .then((items) => {
      const normalized = uniqueById(Array.isArray(items) ? items : []);
      catalogCache = {
        items: normalized,
        expiresAt: Date.now() + CACHE_TTL_MS,
        promise: null,
      };
      return normalized;
    })
    .catch((error) => {
      catalogCache.promise = null;
      throw error;
    });

  return catalogCache.promise;
};

export const loadProductById = async ({ productId, catalogProducts = [], productService = publicProductService } = {}) => {
  if (!productId) {
    return null;
  }

  const fromCatalog = Array.isArray(catalogProducts)
    ? catalogProducts.find((product) => product.id === productId)
    : null;
  if (fromCatalog) {
    return fromCatalog;
  }

  return productService.getProductById(productId);
};

export const loadProductsByIds = async ({ productIds = [], catalogProducts = [], productService = publicProductService } = {}) => {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  if (!uniqueIds.length) {
    return [];
  }

  const catalogMap = new Map((catalogProducts || []).map((product) => [product.id, product]));
  const missingIds = uniqueIds.filter((productId) => !catalogMap.has(productId));

  if (missingIds.length) {
    const loaded = await Promise.all(
      missingIds.map(async (productId) => {
        try {
          return await productService.getProductById(productId);
        } catch {
          return null;
        }
      })
    );
    loaded.filter(Boolean).forEach((product) => {
      catalogMap.set(product.id, product);
    });
  }

  return uniqueIds.map((productId) => catalogMap.get(productId)).filter(Boolean);
};

export const resolveCatalogProduct = async ({ query, catalogProducts = [], productService = publicProductService } = {}) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return { status: "not_found", matches: [] };
  }

  const products = await loadProductCatalog({ catalogProducts, productService });
  return resolveScoredMatches(
    products.map((product) => ({
      product: normalizeCandidate(product),
      score: scoreProductMatch(product, normalizedQuery),
    }))
  );
};

const buildCartSearchCandidate = (cartItem, product) => {
  const displayName = cartItem?.selectedColor?.color
    ? `${cartItem.productName || product?.name || getProductDisplayName(product)} - ${cartItem.selectedColor.color}`
    : (cartItem.productName || product?.name || getProductDisplayName(product));

  return {
    ...product,
    ...cartItem,
    id: cartItem.productId,
    displayName,
    name: cartItem.productName || product?.name || "",
    nameEn: cartItem.productNameEn || product?.nameEn || "",
    selectedColor: cartItem.selectedColor || null,
    categoryName: product?.categoryName || product?.category || "",
    tags: Array.isArray(product?.tags) ? product.tags : [],
  };
};

const scoreCartCandidate = (candidate, query) => {
  const productScore = scoreProductMatch(candidate, query);
  const colorScore = candidate?.selectedColor?.color
    ? (normalizeSearchText(candidate.selectedColor.color).includes(normalizeSearchText(query)) ? 12 : 0)
    : 0;
  return productScore + colorScore;
};

export const resolveCartItem = async ({ query, cartItems = [], catalogProducts = [], productService = publicProductService } = {}) => {
  if (!Array.isArray(cartItems) || !cartItems.length) {
    return { status: "not_found", matches: [] };
  }

  const products = await loadProductsByIds({
    productIds: cartItems.map((item) => item.productId),
    catalogProducts,
    productService,
  });
  const productMap = new Map(products.map((product) => [product.id, product]));

  return resolveScoredMatches(
    cartItems.map((item) => {
      const candidate = buildCartSearchCandidate(item, productMap.get(item.productId));
      return {
        product: candidate,
        score: scoreCartCandidate(candidate, query),
      };
    })
  );
};

export const resolveBulkCartItems = async ({ query, cartItems = [], catalogProducts = [], productService = publicProductService } = {}) => {
  if (!Array.isArray(cartItems) || !cartItems.length) {
    return [];
  }

  const products = await loadProductsByIds({
    productIds: cartItems.map((item) => item.productId),
    catalogProducts,
    productService,
  });
  const productMap = new Map(products.map((product) => [product.id, product]));

  return cartItems
    .map((item) => buildCartSearchCandidate(item, productMap.get(item.productId)))
    .map((candidate) => ({
      candidate,
      score: scoreCartCandidate(candidate, query),
    }))
    .filter((entry) => entry.score >= 70)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.candidate);
};

const extractProductIdFromPageContext = (pageContext = {}) => {
  const hash = `${pageContext?.hash || ""}`.trim();
  if (!hash.startsWith("#product-")) {
    return null;
  }
  return decodeURIComponent(hash.replace("#product-", "").trim());
};

const getRecentProductCards = (messages = []) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (Array.isArray(message?.productCards) && message.productCards.length) {
      return message.productCards;
    }
  }
  return [];
};

export const resolveContextProduct = async ({
  pageContext = {},
  messages = [],
  catalogProducts = [],
  productService = publicProductService,
} = {}) => {
  const pageProductId = extractProductIdFromPageContext(pageContext);
  if (pageProductId) {
    const product = await loadProductById({
      productId: pageProductId,
      catalogProducts,
      productService,
    });
    if (product) {
      return { status: "resolved", product: normalizeCandidate(product), matches: [normalizeCandidate(product)] };
    }
  }

  const recentCards = getRecentProductCards(messages);
  if (recentCards.length === 1) {
    const product = await loadProductById({
      productId: recentCards[0].id,
      catalogProducts,
      productService,
    });
    if (product) {
      return { status: "resolved", product: normalizeCandidate(product), matches: [normalizeCandidate(product)] };
    }
  }

  if (recentCards.length > 1) {
    const products = await loadProductsByIds({
      productIds: recentCards.map((card) => card.id),
      catalogProducts,
      productService,
    });
    const normalized = uniqueById(
      (products.length ? products : recentCards).map((product) => normalizeCandidate(product))
    );
    return {
      status: normalized.length === 1 ? "resolved" : "ambiguous",
      product: normalized[0] || null,
      matches: normalized.slice(0, 3),
    };
  }

  return { status: "not_found", matches: [] };
};
