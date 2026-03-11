import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import {
    buildCartKey,
    getAvailableStockForSelection,
    hasColorVariants,
    normalizeSelectedColor,
} from '../utils/cartUtils';
import { publicProductService } from '../services/publicProductService';

/**
 * Cart slice for public store
 * Persisted to localStorage
 */

const sanitizeStoredItem = (item) => {
    if (!item?.productId) return null;

    const selectedColor = item.selectedColor
        ? {
            color: item.selectedColor.color,
            colorCode: item.selectedColor.colorCode || '#000000',
            colorKey: item.selectedColor.colorKey || `${item.selectedColor.color || ''}`.trim().toLowerCase(),
        }
        : null;

    const cartKey = selectedColor
        ? buildCartKey(item.productId, selectedColor)
        : (item.cartKey || buildCartKey(item.productId, null));

    return {
        cartKey,
        productId: item.productId,
        productName: item.productName || '',
        productNameEn: item.productNameEn || '',
        price: Number(item.price || 0),
        costPrice: Number(item.costPrice || 0),
        image: item.image || '',
        quantity: Math.max(1, Number(item.quantity || 1)),
        selectedColor,
    };
};

export const revalidateCartItems = createAsyncThunk(
    'cart/revalidateItems',
    async (_, { getState }) => {
        const items = getState()?.cart?.items || [];
        if (!items.length) {
            return {
                items: [],
                removedCount: 0,
                clampedCount: 0,
                changed: false,
                message: '',
            };
        }

        const uniqueProductIds = [...new Set(items.map((item) => item.productId).filter(Boolean))];
        const loadedProducts = await Promise.all(
            uniqueProductIds.map(async (productId) => {
                try {
                    const product = await publicProductService.getProductById(productId);
                    return [productId, product];
                } catch {
                    return [productId, null];
                }
            })
        );

        const productMap = new Map(loadedProducts);
        const nextItems = [];
        let removedCount = 0;
        let clampedCount = 0;

        items.forEach((item) => {
            const product = productMap.get(item.productId);
            if (!product || product.inStock === false) {
                removedCount += 1;
                return;
            }

            const normalizedColor = hasColorVariants(product)
                ? normalizeSelectedColor(product, item.selectedColor)
                : null;

            if (hasColorVariants(product) && !normalizedColor) {
                removedCount += 1;
                return;
            }

            const availableStock = getAvailableStockForSelection(product, normalizedColor);
            if (Number.isFinite(availableStock) && availableStock <= 0) {
                removedCount += 1;
                return;
            }

            const currentQty = Math.max(1, Number(item.quantity || 1));
            const nextQty = Number.isFinite(availableStock)
                ? Math.min(currentQty, availableStock)
                : currentQty;

            if (nextQty !== currentQty) {
                clampedCount += 1;
            }

            nextItems.push({
                ...item,
                cartKey: buildCartKey(product.id, normalizedColor),
                productId: product.id,
                productName: product.name || item.productName || '',
                productNameEn: product.nameEn || item.productNameEn || '',
                price: Number(product.price || item.price || 0),
                costPrice: Number(product.costPrice || item.costPrice || 0),
                image: product.images?.[0] || item.image || '',
                quantity: Math.max(1, Number(nextQty || 1)),
                selectedColor: normalizedColor,
            });
        });

        const changed = removedCount > 0 || clampedCount > 0 || nextItems.length !== items.length;
        let message = '';
        if (removedCount > 0 && clampedCount > 0) {
            message = `تم تحديث السلة: حذف ${removedCount} منتج غير متاح وتعديل كميات ${clampedCount} منتج.`;
        } else if (removedCount > 0) {
            message = `تم حذف ${removedCount} منتج من السلة لأنه غير متاح حاليا.`;
        } else if (clampedCount > 0) {
            message = `تم تعديل كميات ${clampedCount} منتج لتتوافق مع المخزون الحالي.`;
        }

        return {
            items: nextItems,
            removedCount,
            clampedCount,
            changed,
            message,
        };
    }
);

// Load cart from localStorage
const loadCartFromStorage = () => {
    try {
        const savedCart = localStorage.getItem('goldenlion_cart');
        if (savedCart) {
            const parsed = JSON.parse(savedCart);
            if (!Array.isArray(parsed)) return [];
            return parsed
                .map((item) => sanitizeStoredItem(item))
                .filter(Boolean);
        }
    } catch (e) {
        console.error('Error loading cart from localStorage:', e);
    }
    return [];
};

// Save cart to localStorage
const saveCartToStorage = (items) => {
    try {
        localStorage.setItem('goldenlion_cart', JSON.stringify(items));
    } catch (e) {
        console.error('Error saving cart to localStorage:', e);
    }
};

const initialState = {
    items: loadCartFromStorage(),
    isOpen: false, // For cart drawer/modal
    inventoryNotice: '',
};

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        addToCart: (state, action) => {
            const { product, quantity = 1, selectedColor = null } = action.payload;

            if (!product?.id || product.inStock === false) {
                return;
            }

            const normalizedColor = normalizeSelectedColor(product, selectedColor);
            const variantRequired = hasColorVariants(product);
            if (variantRequired && !normalizedColor) {
                return;
            }

            const availableStock = getAvailableStockForSelection(product, normalizedColor);
            if (availableStock <= 0) {
                return;
            }

            const cartKey = buildCartKey(product.id, normalizedColor);

            const existingIndex = state.items.findIndex(item => item.cartKey === cartKey);

            if (existingIndex !== -1) {
                // Update quantity if already in cart
                const nextQuantity = state.items[existingIndex].quantity + Number(quantity || 1);
                state.items[existingIndex].quantity = Number.isFinite(availableStock)
                    ? Math.max(1, Math.min(Number(nextQuantity || 1), availableStock))
                    : Math.max(1, Number(nextQuantity || 1));
            } else {
                // Add new item
                const requestedQuantity = Math.max(1, Number(quantity || 1));
                const initialQuantity = Number.isFinite(availableStock)
                    ? Math.min(requestedQuantity, availableStock)
                    : requestedQuantity;

                state.items.push({
                    cartKey,
                    productId: product.id,
                    productName: product.name,
                    productNameEn: product.nameEn || '',
                    price: product.price,
                    costPrice: product.costPrice || 0,
                    image: product.images?.[0] || '',
                    quantity: initialQuantity,
                    // Color variant info
                    selectedColor: normalizedColor,
                });
            }
            saveCartToStorage(state.items);
        },

        removeFromCart: (state, action) => {
            const payload = action.payload;
            const cartKey = typeof payload === 'string' ? payload : payload?.cartKey;
            if (!cartKey) return;
            state.items = state.items.filter(item => item.cartKey !== cartKey);
            saveCartToStorage(state.items);
        },

        updateQuantity: (state, action) => {
            const { cartKey, productId, selectedColor, quantity } = action.payload;

            let resolvedCartKey = cartKey;
            if (!resolvedCartKey && productId) {
                resolvedCartKey = selectedColor
                    ? buildCartKey(productId, selectedColor)
                    : (
                        state.items.find((item) => item.productId === productId && !item.selectedColor)?.cartKey ||
                        state.items.find((item) => item.productId === productId)?.cartKey
                    );
            }

            if (!resolvedCartKey) {
                saveCartToStorage(state.items);
                return;
            }

            const index = state.items.findIndex(item => item.cartKey === resolvedCartKey);

            if (index !== -1) {
                if (quantity <= 0) {
                    state.items.splice(index, 1);
                } else {
                    const requested = Number(quantity || 0);
                    state.items[index].quantity = Math.max(1, requested);
                }
            }
            saveCartToStorage(state.items);
        },

        clearCart: (state) => {
            state.items = [];
            saveCartToStorage(state.items);
        },

        toggleCartOpen: (state) => {
            state.isOpen = !state.isOpen;
        },

        setCartOpen: (state, action) => {
            state.isOpen = action.payload;
        },

        clearInventoryNotice: (state) => {
            state.inventoryNotice = '';
        }
    },
    extraReducers: (builder) => {
        builder.addCase(revalidateCartItems.fulfilled, (state, action) => {
            const payload = action.payload || {};
            state.items = Array.isArray(payload.items) ? payload.items : state.items;
            state.inventoryNotice = payload.message || '';
            saveCartToStorage(state.items);
        });
    },
});

const selectCartState = (state) => state.cart;
export const selectCartItems = createSelector(
    [selectCartState],
    (cart) => cart.items
);
export const selectCartItemCount = createSelector(
    [selectCartItems],
    (items) => items.reduce((total, item) => total + item.quantity, 0)
);
export const selectCartSubtotal = createSelector(
    [selectCartItems],
    (items) => items.reduce((total, item) => total + (item.price * item.quantity), 0)
);
export const selectIsCartOpen = createSelector(
    [selectCartState],
    (cart) => cart.isOpen
);
export const selectCartInventoryNotice = createSelector(
    [selectCartState],
    (cart) => cart.inventoryNotice
);

export const {
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    toggleCartOpen,
    setCartOpen,
    clearInventoryNotice,
} = cartSlice.actions;

export default cartSlice.reducer;
