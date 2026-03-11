import {
  addCartItem,
  buildCartSummary,
  clearCartItems,
  removeCartItem,
  removeManyCartItems,
  updateCartItemQuantity,
} from "../services/cartService";
import {
  buildAddSuccessResponse,
  buildAmbiguousProductResponse,
  buildBulkRemoveSuccessResponse,
  buildCancelledPendingActionResponse,
  buildClearCartConfirmationResponse,
  buildClearCartSuccessResponse,
  buildEmptyCartResponse,
  buildInsufficientStockResponse,
  buildInvalidQuantityResponse,
  buildItemNotFoundResponse,
  buildItemNotInCartResponse,
  buildMissingProductResponse,
  buildOutOfStockResponse,
  buildPendingSelectionRetryResponse,
  buildQuantityRemovedResponse,
  buildRemoveSuccessResponse,
  buildShowCartResponse,
  buildShowTotalResponse,
  buildTemporaryFailureResponse,
  buildUpdateQuantitySuccessResponse,
  buildVariantSelectionRequiredResponse,
} from "../services/chatbotCartResponseBuilder";
import {
  loadProductById,
  loadProductCatalog,
  resolveBulkCartItems,
  resolveCartItem,
  resolveCatalogProduct,
  resolveContextProduct,
} from "../services/productResolver";
import { suggestRelatedProducts } from "../services/relatedProductService";
import { parseCartIntent } from "../utils/parseCartIntent";
import {
  isAffirmativeMessage,
  isCancelMessage,
  resolvePendingSelection,
} from "../utils/pendingCartAction";

const DEFAULT_CURRENCY = "د.ل";

const getCartItems = (getState) => getState?.()?.cart?.items || [];

const createDisambiguationPendingAction = ({ intent, matches = [], quantity = null, quantityMode = "set" } = {}) => ({
  type: "product_disambiguation",
  intent,
  quantity,
  quantityMode,
  matches: matches.map((match) => ({
    id: match.id || match.productId,
    cartKey: match.cartKey || null,
    productId: match.productId || match.id,
    selectedColor: match.selectedColor || null,
    displayName: match.displayName || match.name || match.productName || "منتج",
  })),
});

const resolveAddTarget = async ({ parsedIntent, pageContext, messages, catalogProducts, productService }) => {
  if (parsedIntent.useContextProduct) {
    return resolveContextProduct({ pageContext, messages, catalogProducts, productService });
  }

  return resolveCatalogProduct({
    query: parsedIntent.productQuery,
    catalogProducts,
    productService,
  });
};

const resolveCartTarget = async ({ parsedIntent, cartItems, pageContext, messages, catalogProducts, productService }) => {
  if (parsedIntent.useContextProduct) {
    const contextResolution = await resolveContextProduct({ pageContext, messages, catalogProducts, productService });
    if (contextResolution.status !== "resolved" || !contextResolution.product?.id) {
      return contextResolution;
    }

    const matchedItems = cartItems.filter((item) => item.productId === contextResolution.product.id);
    if (!matchedItems.length) {
      return { status: "not_found", matches: [] };
    }
    if (matchedItems.length === 1) {
      return { status: "resolved", product: matchedItems[0], matches: matchedItems };
    }
    return { status: "ambiguous", matches: matchedItems };
  }

  return resolveCartItem({
    query: parsedIntent.productQuery,
    cartItems,
    catalogProducts,
    productService,
  });
};

const buildAddSuggestions = async ({ product, cartItems, catalogProducts, productService }) => {
  const catalog = await loadProductCatalog({ catalogProducts, productService });
  return suggestRelatedProducts({
    baseProducts: [product],
    catalogProducts: catalog,
    cartItems,
  });
};

const buildCartSuggestions = async ({ cartItems, catalogProducts, productService }) => {
  if (!cartItems.length) {
    return [];
  }

  const catalog = await loadProductCatalog({ catalogProducts, productService });
  const cartProducts = await Promise.all(
    cartItems.slice(0, 3).map((item) => loadProductById({
      productId: item.productId,
      catalogProducts: catalog,
      productService,
    }))
  );

  return suggestRelatedProducts({
    baseProducts: cartProducts.filter(Boolean),
    catalogProducts: catalog,
    cartItems,
  });
};

const handlePendingAction = async ({
  message,
  pendingAction,
  dispatch,
  getState,
  currency,
  catalogProducts,
  productService,
}) => {
  if (!pendingAction) {
    return null;
  }

  if (pendingAction.type === "clear_cart_confirmation") {
    if (isCancelMessage(message)) {
      return buildCancelledPendingActionResponse();
    }

    if (!isAffirmativeMessage(message)) {
      return {
        ...buildClearCartConfirmationResponse(getCartItems(getState).length),
        pendingAction,
      };
    }

    const result = clearCartItems({ dispatch, getState });
    if (result.status === "already_empty") {
      return buildEmptyCartResponse();
    }

    return buildClearCartSuccessResponse();
  }

  if (pendingAction.type === "product_disambiguation") {
    if (isCancelMessage(message)) {
      return buildCancelledPendingActionResponse();
    }

    const selected = resolvePendingSelection(message, pendingAction.matches || []);
    if (!selected) {
      return {
        ...buildPendingSelectionRetryResponse({ matches: pendingAction.matches || [] }),
        pendingAction,
      };
    }

    if (pendingAction.intent === "add_item") {
      const product = await loadProductById({
        productId: selected.productId || selected.id,
        catalogProducts,
        productService,
      });
      if (!product) {
        return buildItemNotFoundResponse(selected.displayName);
      }

      const addResult = addCartItem({
        product,
        quantity: pendingAction.quantity || 1,
        dispatch,
        getState,
      });

      if (addResult.status === "invalid_quantity") {
        return buildInvalidQuantityResponse();
      }
      if (addResult.status === "variant_selection_required") {
        return buildVariantSelectionRequiredResponse(product);
      }
      if (addResult.status === "out_of_stock") {
        return buildOutOfStockResponse(product);
      }
      if (addResult.status === "insufficient_stock") {
        return buildInsufficientStockResponse(addResult);
      }

      const suggestions = await buildAddSuggestions({
        product,
        cartItems: getCartItems(getState),
        catalogProducts,
        productService,
      });
      return buildAddSuccessResponse({
        item: addResult.item,
        summary: addResult.summary,
        currency,
        addedQuantity: addResult.addedQuantity,
        suggestions,
      });
    }

    const cartItem = getCartItems(getState).find((item) => item.cartKey === selected.cartKey) || null;
    if (!cartItem) {
      return buildItemNotInCartResponse(selected.displayName);
    }

    if (pendingAction.intent === "remove_item") {
      const removeResult = removeCartItem({
        item: cartItem,
        dispatch,
        getState,
      });
      return buildRemoveSuccessResponse({
        item: removeResult.item,
        summary: removeResult.summary,
        currency,
      });
    }

    if (pendingAction.intent === "update_quantity") {
      const product = await loadProductById({
        productId: cartItem.productId,
        catalogProducts,
        productService,
      });

      const updateResult = updateCartItemQuantity({
        item: cartItem,
        quantity: pendingAction.quantity,
        quantityMode: pendingAction.quantityMode,
        product: product || cartItem,
        dispatch,
        getState,
      });

      if (updateResult.status === "invalid_quantity") {
        return buildInvalidQuantityResponse();
      }
      if (updateResult.status === "out_of_stock") {
        return buildOutOfStockResponse(product || cartItem);
      }
      if (updateResult.status === "insufficient_stock") {
        return buildInsufficientStockResponse(updateResult);
      }
      if (updateResult.status === "removed") {
        return buildQuantityRemovedResponse({
          item: updateResult.item,
          summary: updateResult.summary,
          currency,
        });
      }

      return buildUpdateQuantitySuccessResponse({
        item: updateResult.item,
        summary: updateResult.summary,
        currency,
      });
    }
  }

  return null;
};

export const handleCartIntent = async ({
  message,
  pageContext = {},
  messages = [],
  pendingAction = null,
  dispatch,
  getState,
  companyCurrency = DEFAULT_CURRENCY,
  catalogProducts = [],
  productService,
}) => {
  const currency = companyCurrency || DEFAULT_CURRENCY;

  try {
    const pendingResponse = await handlePendingAction({
      message,
      pendingAction,
      dispatch,
      getState,
      currency,
      catalogProducts,
      productService,
    });

    if (pendingResponse) {
      return {
        ...pendingResponse,
        pendingAction: pendingResponse.pendingAction || null,
      };
    }

    const parsedIntent = parseCartIntent(message);
    if (!parsedIntent.matched) {
      return { handled: false };
    }

    const cartItems = getCartItems(getState);

    if (parsedIntent.action === "show_cart") {
      if (!cartItems.length) {
        return buildEmptyCartResponse();
      }

      const suggestions = await buildCartSuggestions({
        cartItems,
        catalogProducts,
        productService,
      });

      return buildShowCartResponse({
        items: cartItems,
        summary: buildCartSummary(cartItems),
        currency,
        suggestions,
      });
    }

    if (parsedIntent.action === "show_total") {
      if (!cartItems.length) {
        return buildEmptyCartResponse();
      }

      return buildShowTotalResponse({
        summary: buildCartSummary(cartItems),
        currency,
      });
    }

    if (parsedIntent.action === "clear_cart") {
      if (!cartItems.length) {
        return buildEmptyCartResponse();
      }

      return {
        ...buildClearCartConfirmationResponse(cartItems.length),
        pendingAction: {
          type: "clear_cart_confirmation",
        },
      };
    }

    if (parsedIntent.action === "add_item") {
      if (!parsedIntent.useContextProduct && !parsedIntent.productQuery) {
        return buildMissingProductResponse("add");
      }

      const resolution = await resolveAddTarget({
        parsedIntent,
        pageContext,
        messages,
        catalogProducts,
        productService,
      });

      if (resolution.status === "not_found") {
        return buildItemNotFoundResponse(parsedIntent.productQuery);
      }

      if (resolution.status === "ambiguous") {
        return {
          ...buildAmbiguousProductResponse({
            query: parsedIntent.productQuery,
            matches: resolution.matches,
          }),
          pendingAction: createDisambiguationPendingAction({
            intent: "add_item",
            matches: resolution.matches,
            quantity: parsedIntent.quantity || 1,
          }),
        };
      }

      const addResult = addCartItem({
        product: resolution.product,
        quantity: parsedIntent.quantity || 1,
        dispatch,
        getState,
      });

      if (addResult.status === "invalid_quantity") {
        return buildInvalidQuantityResponse();
      }
      if (addResult.status === "variant_selection_required") {
        return buildVariantSelectionRequiredResponse(resolution.product);
      }
      if (addResult.status === "out_of_stock") {
        return buildOutOfStockResponse(resolution.product);
      }
      if (addResult.status === "insufficient_stock") {
        return buildInsufficientStockResponse(addResult);
      }

      const suggestions = await buildAddSuggestions({
        product: resolution.product,
        cartItems: getCartItems(getState),
        catalogProducts,
        productService,
      });

      return buildAddSuccessResponse({
        item: addResult.item,
        summary: addResult.summary,
        currency,
        addedQuantity: addResult.addedQuantity,
        suggestions,
      });
    }

    if (parsedIntent.action === "remove_many") {
      if (!cartItems.length) {
        return buildEmptyCartResponse();
      }
      if (!parsedIntent.productQuery) {
        return buildMissingProductResponse("remove");
      }

      const matches = await resolveBulkCartItems({
        query: parsedIntent.productQuery,
        cartItems,
        catalogProducts,
        productService,
      });

      if (!matches.length) {
        return buildItemNotInCartResponse(parsedIntent.productQuery);
      }

      const removeResult = removeManyCartItems({
        items: matches,
        dispatch,
        getState,
      });

      return buildBulkRemoveSuccessResponse({
        items: removeResult.items,
        summary: removeResult.summary,
        currency,
      });
    }

    if (parsedIntent.action === "remove_item") {
      if (!cartItems.length) {
        return buildEmptyCartResponse();
      }
      if (!parsedIntent.useContextProduct && !parsedIntent.productQuery) {
        return buildMissingProductResponse("remove");
      }

      const resolution = await resolveCartTarget({
        parsedIntent,
        cartItems,
        pageContext,
        messages,
        catalogProducts,
        productService,
      });

      if (resolution.status === "not_found") {
        return buildItemNotInCartResponse(parsedIntent.productQuery);
      }

      if (resolution.status === "ambiguous") {
        return {
          ...buildAmbiguousProductResponse({
            query: parsedIntent.productQuery,
            matches: resolution.matches,
          }),
          pendingAction: createDisambiguationPendingAction({
            intent: "remove_item",
            matches: resolution.matches,
          }),
        };
      }

      const removeResult = removeCartItem({
        item: resolution.product,
        dispatch,
        getState,
      });

      return buildRemoveSuccessResponse({
        item: removeResult.item,
        summary: removeResult.summary,
        currency,
      });
    }

    if (parsedIntent.action === "update_quantity") {
      if (!cartItems.length) {
        return buildEmptyCartResponse();
      }
      if (!parsedIntent.useContextProduct && !parsedIntent.productQuery) {
        return buildMissingProductResponse("update");
      }
      if (!Number.isInteger(parsedIntent.quantity)) {
        return buildInvalidQuantityResponse();
      }

      const resolution = await resolveCartTarget({
        parsedIntent,
        cartItems,
        pageContext,
        messages,
        catalogProducts,
        productService,
      });

      if (resolution.status === "not_found") {
        return buildItemNotInCartResponse(parsedIntent.productQuery);
      }

      if (resolution.status === "ambiguous") {
        return {
          ...buildAmbiguousProductResponse({
            query: parsedIntent.productQuery,
            matches: resolution.matches,
          }),
          pendingAction: createDisambiguationPendingAction({
            intent: "update_quantity",
            matches: resolution.matches,
            quantity: parsedIntent.quantity,
            quantityMode: parsedIntent.quantityMode || "set",
          }),
        };
      }

      const product = await loadProductById({
        productId: resolution.product.productId,
        catalogProducts,
        productService,
      });
      const updateResult = updateCartItemQuantity({
        item: resolution.product,
        quantity: parsedIntent.quantity,
        quantityMode: parsedIntent.quantityMode || "set",
        product: product || resolution.product,
        dispatch,
        getState,
      });

      if (updateResult.status === "invalid_quantity") {
        return buildInvalidQuantityResponse();
      }
      if (updateResult.status === "out_of_stock") {
        return buildOutOfStockResponse(product || resolution.product);
      }
      if (updateResult.status === "insufficient_stock") {
        return buildInsufficientStockResponse(updateResult);
      }
      if (updateResult.status === "removed") {
        return buildQuantityRemovedResponse({
          item: updateResult.item,
          summary: updateResult.summary,
          currency,
        });
      }

      return buildUpdateQuantitySuccessResponse({
        item: updateResult.item,
        summary: updateResult.summary,
        currency,
      });
    }

    return { handled: false };
  } catch (error) {
    console.error("handleCartIntent.failed", {
      message: error?.message || `${error}`,
    });
    return buildTemporaryFailureResponse();
  }
};
