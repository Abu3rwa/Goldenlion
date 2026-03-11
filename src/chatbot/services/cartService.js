import { addToCart, clearCart, removeFromCart, updateQuantity } from "../../store/cartSlice";
import {
  buildCartKey,
  getAvailableStockForSelection,
  hasColorVariants,
  normalizeSelectedColor,
} from "../../utils/cartUtils";

const getCartItems = (getState) => getState?.()?.cart?.items || [];

export const buildCartSummary = (items = []) => {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return {
    subtotal,
    itemCount,
    uniqueItemCount: items.length,
    totalAmount: subtotal,
  };
};

const findCartEntry = (items, productId, selectedColor = null) => {
  const cartKey = buildCartKey(productId, selectedColor);
  return items.find((item) => item.cartKey === cartKey) || null;
};

const normalizeRequestedQuantity = (quantity) => {
  if (quantity == null || quantity === "") {
    return null;
  }

  const parsed = Number(quantity);
  return Number.isInteger(parsed) ? parsed : null;
};

const resolveSelectedColor = (product, selectedColor = null) => {
  if (!hasColorVariants(product)) {
    return null;
  }

  if (selectedColor) {
    return normalizeSelectedColor(product, selectedColor);
  }

  if (product.colorVariants?.length === 1 && Number(product.colorVariants[0]?.quantity || 0) > 0) {
    return normalizeSelectedColor(product, product.colorVariants[0]);
  }

  return null;
};

export const addCartItem = ({ product, quantity, dispatch, getState, selectedColor = null }) => {
  const requestedQuantity = normalizeRequestedQuantity(quantity);
  if (!product?.id) {
    return { status: "not_found" };
  }

  if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
    return { status: "invalid_quantity" };
  }

  const normalizedColor = resolveSelectedColor(product, selectedColor);
  if (hasColorVariants(product) && !normalizedColor) {
    return { status: "variant_selection_required", product };
  }

  const availableStock = getAvailableStockForSelection(product, normalizedColor);
  if (product.inStock === false || availableStock <= 0) {
    return { status: "out_of_stock", product };
  }

  const beforeItems = getCartItems(getState);
  const existingItem = findCartEntry(beforeItems, product.id, normalizedColor);
  const currentQuantity = Number(existingItem?.quantity || 0);
  const remainingStock = Number.isFinite(availableStock)
    ? Math.max(0, availableStock - currentQuantity)
    : Number.POSITIVE_INFINITY;

  if (remainingStock < requestedQuantity) {
    return {
      status: "insufficient_stock",
      product,
      availableStock,
      remainingStock,
      requestedQuantity,
      currentQuantity,
    };
  }

  dispatch(addToCart({ product, quantity: requestedQuantity, selectedColor: normalizedColor }));

  const afterItems = getCartItems(getState);
  const nextItem = findCartEntry(afterItems, product.id, normalizedColor);

  return {
    status: "success",
    item: nextItem,
    addedQuantity: requestedQuantity,
    summary: buildCartSummary(afterItems),
  };
};

export const removeCartItem = ({ item, dispatch, getState }) => {
  if (!item?.cartKey) {
    return { status: "not_found" };
  }

  dispatch(removeFromCart(item.cartKey));
  return {
    status: "success",
    item,
    summary: buildCartSummary(getCartItems(getState)),
  };
};

export const removeManyCartItems = ({ items = [], dispatch, getState }) => {
  const removable = items.filter((item) => item?.cartKey);
  if (!removable.length) {
    return { status: "not_found" };
  }

  removable.forEach((item) => dispatch(removeFromCart(item.cartKey)));

  return {
    status: "success",
    items: removable,
    summary: buildCartSummary(getCartItems(getState)),
  };
};

export const updateCartItemQuantity = ({ item, quantity, quantityMode = "set", product, dispatch, getState }) => {
  if (!item?.cartKey) {
    return { status: "not_found" };
  }

  const requestedQuantity = normalizeRequestedQuantity(quantity);
  if (!Number.isInteger(requestedQuantity)) {
    return { status: "invalid_quantity" };
  }

  const currentQuantity = Number(item.quantity || 0);
  const nextQuantity = quantityMode === "increment"
    ? currentQuantity + requestedQuantity
    : quantityMode === "decrement"
      ? currentQuantity - requestedQuantity
      : requestedQuantity;

  if (nextQuantity < 0) {
    return { status: "invalid_quantity" };
  }

  if (nextQuantity === 0) {
    dispatch(updateQuantity({ cartKey: item.cartKey, quantity: 0 }));
    return {
      status: "removed",
      item,
      summary: buildCartSummary(getCartItems(getState)),
    };
  }

  const normalizedColor = item.selectedColor || null;
  const availableStock = getAvailableStockForSelection(product, normalizedColor);
  if (product?.inStock === false || availableStock <= 0) {
    return { status: "out_of_stock", product: product || item };
  }

  if (Number.isFinite(availableStock) && nextQuantity > availableStock) {
    return {
      status: "insufficient_stock",
      product: product || item,
      availableStock,
      remainingStock: availableStock,
      requestedQuantity: nextQuantity,
      currentQuantity,
    };
  }

  dispatch(updateQuantity({ cartKey: item.cartKey, quantity: nextQuantity }));
  const nextItem = getCartItems(getState).find((cartItem) => cartItem.cartKey === item.cartKey) || {
    ...item,
    quantity: nextQuantity,
  };

  return {
    status: "success",
    item: nextItem,
    summary: buildCartSummary(getCartItems(getState)),
  };
};

export const clearCartItems = ({ dispatch, getState }) => {
  const items = getCartItems(getState);
  if (!items.length) {
    return { status: "already_empty" };
  }

  dispatch(clearCart());
  return {
    status: "success",
    clearedCount: items.length,
    summary: buildCartSummary(getCartItems(getState)),
  };
};
