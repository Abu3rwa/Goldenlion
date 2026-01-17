import { createSlice } from '@reduxjs/toolkit';

/**
 * Cart slice for public store
 * Persisted to localStorage
 */

// Load cart from localStorage
const loadCartFromStorage = () => {
    try {
        const savedCart = localStorage.getItem('goldenlion_cart');
        if (savedCart) {
            return JSON.parse(savedCart);
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
};

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        addToCart: (state, action) => {
            const { product, quantity = 1 } = action.payload;
            const existingIndex = state.items.findIndex(item => item.productId === product.id);

            if (existingIndex !== -1) {
                // Update quantity if already in cart
                state.items[existingIndex].quantity += quantity;
            } else {
                // Add new item
                state.items.push({
                    productId: product.id,
                    productName: product.name,
                    productNameEn: product.nameEn || '',
                    price: product.price,
                    image: product.images?.[0] || '',
                    quantity
                });
            }
            saveCartToStorage(state.items);
        },

        removeFromCart: (state, action) => {
            const productId = action.payload;
            state.items = state.items.filter(item => item.productId !== productId);
            saveCartToStorage(state.items);
        },

        updateQuantity: (state, action) => {
            const { productId, quantity } = action.payload;
            const index = state.items.findIndex(item => item.productId === productId);

            if (index !== -1) {
                if (quantity <= 0) {
                    state.items.splice(index, 1);
                } else {
                    state.items[index].quantity = quantity;
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
        }
    },
});

// Selectors
export const selectCartItems = (state) => state.cart.items;
export const selectCartItemCount = (state) =>
    state.cart.items.reduce((total, item) => total + item.quantity, 0);
export const selectCartSubtotal = (state) =>
    state.cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
export const selectIsCartOpen = (state) => state.cart.isOpen;

export const {
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    toggleCartOpen,
    setCartOpen
} = cartSlice.actions;

export default cartSlice.reducer;
