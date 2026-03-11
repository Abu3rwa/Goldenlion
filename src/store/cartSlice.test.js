import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import cartReducer, { addToCart, revalidateCartItems, updateQuantity } from './cartSlice';
import { publicProductService } from '../services/publicProductService';

vi.mock('../services/publicProductService', () => ({
    publicProductService: {
        getProductById: vi.fn(),
    },
}));

describe('cartSlice', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('prevents adding variant product without selecting a color', () => {
        const variantProduct = {
            id: 'p-variant',
            name: 'منتج متعدد الألوان',
            inStock: true,
            price: 1000,
            colorVariants: [{ color: 'أسود', colorCode: '#000', quantity: 5 }],
        };

        const state = cartReducer(undefined, addToCart({ product: variantProduct, quantity: 1 }));
        expect(state.items).toHaveLength(0);
    });

    it('creates stable cart key for selected variant and clamps quantity by variant stock', () => {
        const variantProduct = {
            id: 'p-variant',
            name: 'منتج متعدد الألوان',
            inStock: true,
            price: 1000,
            colorVariants: [{ color: 'Black', colorCode: '#000', quantity: 2 }],
        };

        let state = cartReducer(
            undefined,
            addToCart({ product: variantProduct, quantity: 1, selectedColor: { color: 'Black' } })
        );

        state = cartReducer(
            state,
            addToCart({ product: variantProduct, quantity: 5, selectedColor: { color: 'Black' } })
        );

        expect(state.items).toHaveLength(1);
        expect(state.items[0].cartKey).toBe('p-variant::black');
        expect(state.items[0].quantity).toBe(2);
    });

    it('supports legacy productId quantity payload by resolving non-variant cart key', () => {
        const product = {
            id: 'p-1',
            name: 'شنطة',
            inStock: true,
            totalStock: 10,
            price: 1200,
            colorVariants: [],
        };

        let state = cartReducer(undefined, addToCart({ product, quantity: 1 }));
        state = cartReducer(state, updateQuantity({ productId: 'p-1', quantity: 3 }));

        expect(state.items).toHaveLength(1);
        expect(state.items[0].cartKey).toBe('p-1');
        expect(state.items[0].quantity).toBe(3);
    });

    it('allows adding legacy in-stock products even when totalStock is stored as zero', () => {
        const product = {
            id: 'legacy-p-1',
            name: 'منتج قديم',
            inStock: true,
            totalStock: 0,
            price: 1500,
            colorVariants: [],
        };

        const state = cartReducer(undefined, addToCart({ product, quantity: 1 }));

        expect(state.items).toHaveLength(1);
        expect(state.items[0].cartKey).toBe('legacy-p-1');
        expect(state.items[0].quantity).toBe(1);
    });

    it('revalidates stale cart and clamps/removes items using live inventory', async () => {
        const preloadedState = {
            cart: {
                items: [
                    {
                        cartKey: 'p-1',
                        productId: 'p-1',
                        productName: 'منتج 1',
                        price: 1000,
                        quantity: 5,
                        image: '',
                        selectedColor: null,
                    },
                    {
                        cartKey: 'p-2',
                        productId: 'p-2',
                        productName: 'منتج 2',
                        price: 2000,
                        quantity: 1,
                        image: '',
                        selectedColor: null,
                    },
                ],
                isOpen: false,
                inventoryNotice: '',
            },
        };

        publicProductService.getProductById.mockImplementation(async (id) => {
            if (id === 'p-1') {
                return {
                    id: 'p-1',
                    name: 'منتج 1 محدث',
                    price: 1000,
                    inStock: true,
                    totalStock: 2,
                    colorVariants: [],
                    images: ['https://img/1.png'],
                };
            }
            if (id === 'p-2') {
                return {
                    id: 'p-2',
                    name: 'منتج 2',
                    price: 2000,
                    inStock: false,
                    totalStock: 0,
                    colorVariants: [],
                    images: [],
                };
            }
            return null;
        });

        const store = configureStore({
            reducer: {
                cart: cartReducer,
            },
            preloadedState,
        });

        await store.dispatch(revalidateCartItems());
        const nextState = store.getState().cart;

        expect(nextState.items).toHaveLength(1);
        expect(nextState.items[0].productId).toBe('p-1');
        expect(nextState.items[0].quantity).toBe(2);
        expect(nextState.inventoryNotice).toContain('تحديث السلة');
    });
});
