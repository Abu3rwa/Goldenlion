import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StorePage from './StorePage';
import cartReducer from '../store/cartSlice';
import publicCategoriesReducer from '../store/publicCategoriesSlice';
import { publicProductService } from '../services/publicProductService';
import { publicCategoryService } from '../services/publicCategoryService';

vi.mock('../services/publicProductService', () => ({
    publicProductService: {
        getStorefrontProducts: vi.fn(),
    },
}));

vi.mock('../services/publicCategoryService', () => ({
    publicCategoryService: {
        getAllCategories: vi.fn(),
        addCategory: vi.fn(),
        findCategoryByName: vi.fn(),
        ensureCategory: vi.fn(),
        syncCategoryCounts: vi.fn(),
    },
}));

vi.mock('../services/userService', () => ({
    userService: {
        canPerformAction: vi.fn(() => false),
    },
}));

vi.mock('../components/CartDrawer', () => ({
    default: () => null,
}));

vi.mock('../components/ProductDetailsModal', () => ({
    default: () => null,
}));

const createTestStore = () => configureStore({
    reducer: {
        cart: cartReducer,
        publicCategories: publicCategoriesReducer,
        company: (state = { currency: 'د.ل', phone: '218931169753' }) => state,
        auth: (state = { user: null, userProfile: null }) => state,
    },
});

describe('StorePage filters', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();

        publicCategoryService.getAllCategories.mockResolvedValue([
            { id: 'bags', name: 'شنط', inStockCount: 5, productCount: 9 },
            { id: 'wallets', name: 'محافظ', inStockCount: 2, productCount: 4 },
        ]);

        publicProductService.getStorefrontProducts.mockResolvedValue({
            items: [
                {
                    id: 'p-1',
                    name: 'شنطة عملية',
                    price: 1000,
                    inStock: true,
                    categoryId: 'bags',
                    categoryName: 'شنط',
                    images: [],
                    colorVariants: [],
                },
            ],
            nextCursor: null,
            hasMore: false,
            mode: 'server',
        });
    });

    it('reads category filter from URL and refetches when category chip changes', async () => {
        const user = userEvent.setup();
        const store = createTestStore();

        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={['/store?category=bags']}>
                    <Routes>
                        <Route path="/store" element={<StorePage />} />
                    </Routes>
                </MemoryRouter>
            </Provider>
        );

        await waitFor(() => {
            expect(publicProductService.getStorefrontProducts).toHaveBeenCalledWith(
                expect.objectContaining({
                    filters: expect.objectContaining({
                        category: 'bags',
                    }),
                })
            );
        });

        await user.click(screen.getByRole('button', { name: /محافظ/ }));

        await waitFor(() => {
            expect(publicProductService.getStorefrontProducts).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    filters: expect.objectContaining({
                        category: 'wallets',
                    }),
                })
            );
        });
    }, 15000);
});
